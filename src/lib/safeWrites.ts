import type { QueryClient } from '@tanstack/react-query';
import {
  ACHIEVEMENTS_BY_KEY, LESSON_RATINGS, NOTIFICATION_TOGGLE_KEYS, isLessonPhase, parsePreferredTime,
  isAchievementKey, type AchievementKey, type ActivePathRef, type Lesson, type LessonPhase, type LessonRating, type NotificationPreference,
  type QuizResult, type RegisterPushTokenRequest, type SaveLessonResponse, type TrackBuild, type SubmitQuizRequest, type UpdateNotificationPreferencesRequest,
  type UpdateProfileRequest,
} from '@learning/shared';
import { trackService } from '@/services/track.service';
import { quizService } from '@/services/quiz.service';
import { lessonService } from '@/services/lesson.service';
import { notificationService } from '@/services/notification.service';
import { userService } from '@/services/user.service';
import { trackBuilderService } from '@/services/trackBuilder.service';
import { achievementService } from '@/services/achievement.service';
import { BREADCRUMB_CATEGORY, warnBreadcrumb } from '@/lib/breadcrumbs';
import {
  ACHIEVEMENTS_QUERY_KEY, ALTITUDE_QUERY_KEY, NOTIFICATION_PREFERENCES_QUERY_KEY, PATHS_QUERY_KEY, PROGRESS_QUERY_KEY, SAVED_LESSONS_QUERY_KEY, TRACK_CONTENTS_QUERY_KEY, WEEK_QUERY_KEY, lessonQueryKey,
} from '@/lib/queryKeys';
import {
  PATHS_WRITE_SCOPE, PREFERENCES_WRITE_SCOPE, PROFILE_WRITE_SCOPE, PUSH_TOKEN_MUTATION_KEY, PUSH_TOKEN_WRITE_SCOPE, SAVE_LESSON_MUTATION_KEY,
  SAVE_POSITION_MUTATION_KEY, SET_ACTIVE_PATH_MUTATION_KEY, SET_RATING_MUTATION_KEY, SUBMIT_QUIZ_MUTATION_KEY, UNSAVE_LESSON_MUTATION_KEY,
  START_TRACK_BUILD_MUTATION_KEY, MARK_ACHIEVEMENT_SEEN_MUTATION_KEY, UPDATE_PREFERENCES_MUTATION_KEY, UPDATE_PROFILE_MUTATION_KEY,
} from '@/lib/mutationKeys';
import { SAFE_WRITE_OPTIONS, assertWriteNotDiscarded } from '@/lib/offlineWrites';
import { newIdempotencyKey } from '@/lib/idempotencyKey';
import { isOptionalBoolean, isOptionalNumber, isOptionalString, isRecord, isStringRecord } from '@/lib/guards';
import { scopeOption, settleWhenLast, type OptimisticWrite, type SafeWrite, type SafeWriteVariables, type WriteOutcome } from '@/lib/writeSettle';
import { invalidatePathQueries } from '@/lib/pathInvalidation';
import { enqueueRewardsOf } from '@/lib/rewards';

/**
 * Every write that uses the patchy-signal mechanism (ADR-019 Decision 6, ADR-021 Decisions 4 and 5):
 * one entry per action, with its request and settle step, so a write restored from device storage
 * after a restart runs the same steps. The one optimistic write (`useOptimisticMutation`) names the
 * cache entry it changes ahead of the server; every other write here waits for the server's reply
 * (`useSafeWrite`) and carries an idempotency key, so a retry gets the first result back.
 *
 * A restored write's variables come from device storage, so each entry narrows them with a guard
 * and refuses what it can't read, rather than sending a guess.
 */

function activePathRefOf(value: unknown): ActivePathRef {
  if (isRecord(value) && (value.kind === 'track' || value.kind === 'custom') && typeof value.id === 'string') {
    return { kind: value.kind, id: value.id };
  }
  throw new Error('A saved "make active" write has no path');
}

export const SET_ACTIVE_PATH_WRITE: OptimisticWrite = {
  mutationKey: SET_ACTIVE_PATH_MUTATION_KEY,
  scope: PATHS_WRITE_SCOPE,
  queryKey: PATHS_QUERY_KEY,
  mutationFn: (variables) => {
    assertWriteNotDiscarded(variables);
    return trackService.setActivePath(activePathRefOf(variables));
  },
  settle: invalidatePathQueries,
};

/** The tap's input and its key (`useSafeWrite`). */
function variablesOf(value: unknown): SafeWriteVariables<unknown> {
  if (isRecord(value) && 'input' in value && typeof value.idempotencyKey === 'string') {
    return { input: value.input, idempotencyKey: value.idempotencyKey };
  }
  throw new Error('A saved write has no idempotency key');
}

/** A write on one lesson. */
export interface LessonInput {
  lessonId: string;
}

function lessonInputOf(input: unknown): LessonInput {
  if (isRecord(input) && typeof input.lessonId === 'string') return { lessonId: input.lessonId };
  throw new Error('A saved lesson write names no lesson');
}

/**
 * The request of a write the server replays on its key: refuses a write sign-out discarded, reads
 * the tap's input with `inputOf` and the key from the variables, and sends both.
 */
function keyedRequest<TInput, TData>(
  inputOf: (input: unknown) => TInput,
  send: (input: TInput, idempotencyKey: string) => Promise<TData>,
): (variables: unknown) => Promise<TData> {
  return (variables) => {
    assertWriteNotDiscarded(variables);
    const { input, idempotencyKey } = variablesOf(variables);
    return send(inputOf(input), idempotencyKey);
  };
}

/** Invalidates `keys` only when the write succeeded: today's `onSuccess` steps. */
async function invalidateOnSuccess(client: QueryClient, outcome: WriteOutcome, keys: readonly (readonly unknown[])[]): Promise<void> {
  if (outcome.error !== null) return;
  await Promise.all(keys.map((queryKey) => client.invalidateQueries({ queryKey })));
}

// ─── Quiz answer ─────────────────────────────────────────────────────────────

export type SubmitQuizInput = SubmitQuizRequest & LessonInput;

function submitQuizInputOf(input: unknown): SubmitQuizInput {
  if (isRecord(input) && typeof input.lessonId === 'string' && isStringRecord(input.answers)
    && isOptionalBoolean(input.isRetake) && isOptionalBoolean(input.skipRetake) && isOptionalNumber(input.completionTime)) {
    return { lessonId: input.lessonId, answers: input.answers, isRetake: input.isRetake, skipRetake: input.skipRetake, completionTime: input.completionTime };
  }
  throw new Error('A saved quiz answer is not a quiz answer');
}

export const SUBMIT_QUIZ_WRITE: SafeWrite<QuizResult> = {
  mutationKey: SUBMIT_QUIZ_MUTATION_KEY,
  mutationFn: keyedRequest(submitQuizInputOf, ({ lessonId, answers, ...options }, key) => quizService.submitQuiz(lessonId, answers, options, key)),
  // A finalised lesson moves the paths, progress, the lesson, the track tree (its progress marks), the altitude it paid, the achievements and the week.
  settle: async (client, outcome) => {
    if (outcome.error !== null || !isRecord(outcome.data) || outcome.data.lessonFinalized !== true) return;
    const { lessonId } = lessonInputOf(variablesOf(outcome.variables).input);
    await invalidateOnSuccess(client, outcome, [PATHS_QUERY_KEY, PROGRESS_QUERY_KEY, lessonQueryKey(lessonId), TRACK_CONTENTS_QUERY_KEY, ALTITUDE_QUERY_KEY, ACHIEVEMENTS_QUERY_KEY, WEEK_QUERY_KEY]);
  },
};

// ─── Reading position ────────────────────────────────────────────────────────

export interface SavePositionInput extends LessonInput {
  phase: LessonPhase;
}

function savePositionInputOf(input: unknown): SavePositionInput {
  if (isRecord(input) && typeof input.lessonId === 'string' && typeof input.phase === 'string' && isLessonPhase(input.phase)) return { lessonId: input.lessonId, phase: input.phase };
  throw new Error('A saved reading position has no phase');
}

export const SAVE_POSITION_WRITE: SafeWrite<void> = {
  mutationKey: SAVE_POSITION_MUTATION_KEY,
  mutationFn: keyedRequest(savePositionInputOf, ({ lessonId, phase }, key) => lessonService.updatePosition(lessonId, phase, key)),
};

// ─── Rating ──────────────────────────────────────────────────────────────────

export interface SetRatingInput extends LessonInput {
  rating: LessonRating | null;
}

function isLessonRatingOrNull(value: unknown): value is LessonRating | null {
  return value === null || (LESSON_RATINGS as readonly unknown[]).includes(value);
}

function setRatingInputOf(input: unknown): SetRatingInput {
  if (isRecord(input) && typeof input.lessonId === 'string' && isLessonRatingOrNull(input.rating)) return { lessonId: input.lessonId, rating: input.rating };
  throw new Error('A saved rating is not a rating');
}

export const SET_RATING_WRITE: SafeWrite<void> = {
  mutationKey: SET_RATING_MUTATION_KEY,
  mutationFn: keyedRequest(setRatingInputOf, ({ lessonId, rating }, key) => lessonService.setRating(lessonId, rating, key)),
  // Keep the cached lesson current so a revisit shows the stored verdict without a refetch.
  settle: async (client, outcome) => {
    if (outcome.error !== null) return;
    const { lessonId, rating } = setRatingInputOf(variablesOf(outcome.variables).input);
    client.setQueryData<Lesson>(lessonQueryKey(lessonId), (lesson) => lesson && { ...lesson, rating });
  },
};

// ─── Save and unsave ─────────────────────────────────────────────────────────

export const SAVE_LESSON_WRITE: SafeWrite<SaveLessonResponse> = {
  mutationKey: SAVE_LESSON_MUTATION_KEY,
  mutationFn: keyedRequest(lessonInputOf, ({ lessonId }, key) => lessonService.saveLesson(lessonId, key)),
  // Saving can unlock Pocketed (so the week moves too) and moves Magpie's count: its rewards go to the celebration queue, for a write restored after a restart too.
  settle: async (client, outcome) => {
    if (outcome.error !== null) return;
    enqueueRewardsOf(outcome.data);
    await invalidateOnSuccess(client, outcome, [SAVED_LESSONS_QUERY_KEY, ACHIEVEMENTS_QUERY_KEY, WEEK_QUERY_KEY]);
  },
};

export const UNSAVE_LESSON_WRITE: SafeWrite<void> = {
  mutationKey: UNSAVE_LESSON_MUTATION_KEY,
  mutationFn: keyedRequest(lessonInputOf, ({ lessonId }, key) => lessonService.unsaveLesson(lessonId, key)),
  settle: (client, outcome) => invalidateOnSuccess(client, outcome, [SAVED_LESSONS_QUERY_KEY, ACHIEVEMENTS_QUERY_KEY]),
};

// ─── Notification preferences ────────────────────────────────────────────────

function preferencesInputOf(input: unknown): UpdateNotificationPreferencesRequest {
  if (!isRecord(input)) throw new Error('Saved notification preferences are not preferences');
  const prefs: UpdateNotificationPreferencesRequest = {};
  for (const key of NOTIFICATION_TOGGLE_KEYS) {
    const value = input[key];
    if (!isOptionalBoolean(value)) throw new Error('Saved notification preferences are not preferences');
    if (value !== undefined) prefs[key] = value;
  }
  const recapTime = input.weeklyRecapTime;
  if (recapTime !== undefined) {
    // Strict, like the server's check: a time the recap job could not match is not restored.
    if (typeof recapTime !== 'string' || parsePreferredTime(recapTime) === null) throw new Error('Saved notification preferences are not preferences');
    prefs.weeklyRecapTime = recapTime;
  }
  return prefs;
}

export const UPDATE_PREFERENCES_WRITE: SafeWrite<NotificationPreference> = {
  mutationKey: UPDATE_PREFERENCES_MUTATION_KEY,
  scope: PREFERENCES_WRITE_SCOPE,
  mutationFn: keyedRequest(preferencesInputOf, (prefs, key) => notificationService.updatePreferences(prefs, key)),
  settle: (client, outcome) => invalidateOnSuccess(client, outcome, [NOTIFICATION_PREFERENCES_QUERY_KEY]),
};

// ─── Profile ─────────────────────────────────────────────────────────────────

function profileInputOf(input: unknown): UpdateProfileRequest {
  if (isRecord(input) && isOptionalString(input.preferredTime) && isOptionalString(input.timezone)
    && isOptionalString(input.learningStyle) && isOptionalBoolean(input.onboardingCompleted)) {
    const profile: UpdateProfileRequest = {};
    if (input.preferredTime !== undefined) profile.preferredTime = input.preferredTime;
    if (input.timezone !== undefined) profile.timezone = input.timezone;
    if (input.learningStyle !== undefined) profile.learningStyle = input.learningStyle;
    if (input.onboardingCompleted !== undefined) profile.onboardingCompleted = input.onboardingCompleted;
    return profile;
  }
  throw new Error('A saved profile change is not a profile change');
}

export const UPDATE_PROFILE_WRITE: SafeWrite<void> = {
  mutationKey: UPDATE_PROFILE_MUTATION_KEY,
  scope: PROFILE_WRITE_SCOPE,
  mutationFn: keyedRequest(profileInputOf, (profile, key) => userService.updateProfile(profile, key)),
};

// ─── Push token ──────────────────────────────────────────────────────────────

function pushTokenInputOf(input: unknown): RegisterPushTokenRequest {
  if (isRecord(input) && typeof input.token === 'string' && (input.platform === 'expo' || input.platform === 'web') && isOptionalString(input.deviceId)) {
    return { token: input.token, platform: input.platform, ...(input.deviceId === undefined ? {} : { deviceId: input.deviceId }) };
  }
  throw new Error('A saved push token is not a push token');
}

export const PUSH_TOKEN_WRITE: SafeWrite<void> = {
  mutationKey: PUSH_TOKEN_MUTATION_KEY,
  scope: PUSH_TOKEN_WRITE_SCOPE,
  mutationFn: keyedRequest(pushTokenInputOf, (body, key) => notificationService.registerPushToken(body, key)),
};

// ─── Starting a path build ───────────────────────────────────────────────────

export interface StartTrackBuildInput {
  statement: string;
}

function startTrackBuildInputOf(input: unknown): StartTrackBuildInput {
  if (isRecord(input) && typeof input.statement === 'string') return { statement: input.statement };
  throw new Error('A saved path build has no words');
}

/**
 * The one Albert action that is saved through a drop (ADR-021 Amendment 1): the tap's key is the build's
 * id, and the server returns the existing build for a repeated id. Every other Albert action keeps `requireSignal`.
 */
export const START_TRACK_BUILD_WRITE: SafeWrite<TrackBuild> = {
  mutationKey: START_TRACK_BUILD_MUTATION_KEY,
  mutationFn: keyedRequest(startTrackBuildInputOf, ({ statement }, buildId) => trackBuilderService.startBuild(statement, buildId)),
};

// ─── Marking an unlock seen ──────────────────────────────────────────────────

export interface MarkAchievementSeenInput {
  key: AchievementKey;
}

function markSeenInputOf(input: unknown): MarkAchievementSeenInput {
  if (isRecord(input) && typeof input.key === 'string' && isAchievementKey(input.key)) return { key: input.key };
  throw new Error('A saved "seen" write names no achievement');
}

/**
 * Sent when a celebration is dismissed. The queue has already stopped showing the unlock, so a failure
 * (after the retries) is only logged: it is never shown again this session (ADR-022 Decision 5).
 */
export const MARK_ACHIEVEMENT_SEEN_WRITE: SafeWrite<void> = {
  mutationKey: MARK_ACHIEVEMENT_SEEN_MUTATION_KEY,
  mutationFn: keyedRequest(markSeenInputOf, ({ key }, idempotencyKey) => achievementService.markSeen(key, idempotencyKey)),
  settle: async (client, outcome) => {
    const { key } = markSeenInputOf(variablesOf(outcome.variables).input);
    if (outcome.error !== null) {
      warnBreadcrumb(BREADCRUMB_CATEGORY.ui, 'Marking an achievement seen failed', outcome.error, { key });
      return;
    }
    // A landmark seen is no longer the altitude's `newLandmark`, so the badge slot moves on to the next one.
    if (ACHIEVEMENTS_BY_KEY[key].kind === 'landmark') await client.invalidateQueries({ queryKey: ALTITUDE_QUERY_KEY });
  },
};

export const SAFE_WRITES: readonly SafeWrite[] = [
  SET_ACTIVE_PATH_WRITE,
  SUBMIT_QUIZ_WRITE,
  SAVE_POSITION_WRITE,
  SET_RATING_WRITE,
  SAVE_LESSON_WRITE,
  UNSAVE_LESSON_WRITE,
  UPDATE_PREFERENCES_WRITE,
  UPDATE_PROFILE_WRITE,
  PUSH_TOKEN_WRITE,
  START_TRACK_BUILD_WRITE,
  MARK_ACHIEVEMENT_SEEN_WRITE,
];

/** Gives a write restored after a restart its request, its retry rule and its settle step. */
export function registerSafeWrites(client: QueryClient): void {
  for (const write of SAFE_WRITES) {
    client.setMutationDefaults(write.mutationKey, {
      ...SAFE_WRITE_OPTIONS,
      ...scopeOption(write.scope),
      mutationFn: write.mutationFn,
      onSettled: (data, error, variables) => settleWhenLast(client, write, { data, error, variables }),
    });
  }
}

/**
 * Starts a write outside a component with `variables` as they are. The defaults `registerSafeWrites`
 * gave its key supply the request, retry rule, scope and settle step.
 */
export function startRegisteredWrite(client: QueryClient, write: SafeWrite, variables: unknown): Promise<unknown> {
  const options = client.defaultMutationOptions({ mutationKey: write.mutationKey });
  return client.getMutationCache().build(client, options).execute(variables);
}

/**
 * Runs a write outside a component (the push token, from the notifications effect) through the
 * same mechanism as `useSafeWrite`: it pauses offline, retries, and is saved across a restart.
 */
export function runSafeWrite(client: QueryClient, write: SafeWrite, input: unknown): Promise<unknown> {
  return startRegisteredWrite(client, write, { input, idempotencyKey: newIdempotencyKey() });
}
