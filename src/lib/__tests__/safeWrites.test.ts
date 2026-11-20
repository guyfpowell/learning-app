import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, onlineManager } from '@tanstack/react-query';
import { persistQueryClientRestore } from '@tanstack/react-query-persist-client';
import { waitFor } from '@testing-library/react-native';
import { axiosError } from '@/test-utils/axios';
import { ERROR_CODES, LESSON_PHASES, LESSON_RATINGS, formatPreferredTime } from '@learning/shared';
import { makeNotificationPreference } from '@/test-utils/notificationPreferences';
import { makeRewardUnlock, makeRewards } from '@/test-utils/achievements';
import { useCelebrationQueueStore } from '@/store/celebrationQueue.store';
import { ACHIEVEMENTS_QUERY_KEY, ALTITUDE_QUERY_KEY, PATHS_QUERY_KEY, PROGRESS_QUERY_KEY, SAVED_LESSONS_QUERY_KEY, SKILLS_QUERY_KEY, TRACK_CONTENTS_QUERY_KEY, UNSEEN_ACHIEVEMENTS_QUERY_KEY, WEEK_QUERY_KEY, lessonQueryKey } from '@/lib/queryKeys';
import { createTestQueryClient } from '@/test-utils/queryClient';
import { createAppQueryClient } from '@/test-utils/appQueryClient';
import { pauseSetActiveWrite, saveToDevice } from '@/test-utils/pausedWrite';
import { must } from '@/test-utils/must';
import { trackService } from '@/services/track.service';
import { quizService } from '@/services/quiz.service';
import { lessonService } from '@/services/lesson.service';
import { notificationService } from '@/services/notification.service';
import { userService } from '@/services/user.service';
import { trackBuilderService } from '@/services/trackBuilder.service';
import { makeCustomPath, makeTrackPath } from '@/test-utils/paths';
import { newIdempotencyKey } from '../idempotencyKey';
import { lessonWriteScope } from '../mutationKeys';
import { PERSIST_MAX_AGE_MS, writePersister } from '../offlineWrites';
import {
  PUSH_TOKEN_WRITE, SAVE_LESSON_WRITE, SAVE_POSITION_WRITE, SET_ACTIVE_PATH_WRITE, SET_RATING_WRITE, SUBMIT_QUIZ_WRITE,
  START_TRACK_BUILD_WRITE, MARK_ACHIEVEMENT_SEEN_WRITE, UNSAVE_LESSON_WRITE, UPDATE_PREFERENCES_WRITE, UPDATE_PROFILE_WRITE, registerSafeWrites,
  startRegisteredWrite,
} from '../safeWrites';
import type { SafeWrite } from '../writeSettle';

jest.mock('@/services/track.service', () => ({ trackService: { setActivePath: jest.fn() } }));
jest.mock('@/services/quiz.service', () => ({ quizService: { submitQuiz: jest.fn() } }));
jest.mock('@/services/lesson.service', () => ({
  lessonService: { updatePosition: jest.fn(), setRating: jest.fn(), saveLesson: jest.fn(), unsaveLesson: jest.fn() },
}));
jest.mock('@/services/notification.service', () => ({
  notificationService: { updatePreferences: jest.fn(), registerPushToken: jest.fn() },
}));
jest.mock('@/services/user.service', () => ({ userService: { updateProfile: jest.fn() } }));
jest.mock('@/services/trackBuilder.service', () => ({ trackBuilderService: { startBuild: jest.fn() } }));

const mockTrackService = trackService as jest.Mocked<typeof trackService>;
const ref = { kind: 'custom', id: 'p1' } as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const KEY = 'saved-key-1';
const REPLY = { saved: true };


const flush = () => new Promise<void>((resolve) => { setTimeout(resolve, 0); });

/** A client with the app's defaults and every safe write registered, as `QueryProvider` builds it. */
function appClient(): QueryClient {
  const client = createAppQueryClient();
  registerSafeWrites(client);
  return client;
}

/** The writes that wait for the server, each with an input it accepts, one it must refuse, and the request it sends. */
interface WriteCase {
  name: string;
  write: SafeWrite;
  scope: string | undefined;
  input: unknown;
  unreadableInput: unknown;
  request: jest.Mock;
}

const CASES: WriteCase[] = [
  {
    name: 'quiz answer', write: SUBMIT_QUIZ_WRITE, scope: lessonWriteScope('l1'),
    input: { lessonId: 'l1', answers: { q1: 'a' } }, unreadableInput: { lessonId: 'l1', answers: { q1: 1 } }, request: jest.mocked(quizService.submitQuiz),
  },
  {
    name: 'reading position', write: SAVE_POSITION_WRITE, scope: lessonWriteScope('l1'),
    input: { lessonId: 'l1', phase: LESSON_PHASES[0] }, unreadableInput: { lessonId: 'l1', phase: 'nowhere' }, request: jest.mocked(lessonService.updatePosition),
  },
  {
    name: 'rating', write: SET_RATING_WRITE, scope: lessonWriteScope('l1'),
    input: { lessonId: 'l1', rating: LESSON_RATINGS[0] }, unreadableInput: { lessonId: 'l1', rating: 'sideways' }, request: jest.mocked(lessonService.setRating),
  },
  {
    name: 'save', write: SAVE_LESSON_WRITE, scope: lessonWriteScope('l1'),
    input: { lessonId: 'l1' }, unreadableInput: {}, request: jest.mocked(lessonService.saveLesson),
  },
  {
    name: 'unsave', write: UNSAVE_LESSON_WRITE, scope: lessonWriteScope('l1'),
    input: { lessonId: 'l1' }, unreadableInput: { lessonId: 7 }, request: jest.mocked(lessonService.unsaveLesson),
  },
  {
    name: 'notification preferences', write: UPDATE_PREFERENCES_WRITE, scope: UPDATE_PREFERENCES_WRITE.scope,
    input: { enableStreak: false }, unreadableInput: { enableStreak: 'no' }, request: jest.mocked(notificationService.updatePreferences),
  },
  {
    name: 'profile', write: UPDATE_PROFILE_WRITE, scope: UPDATE_PROFILE_WRITE.scope,
    input: { timezone: 'Europe/London' }, unreadableInput: { timezone: 5 }, request: jest.mocked(userService.updateProfile),
  },
  {
    name: 'push token', write: PUSH_TOKEN_WRITE, scope: PUSH_TOKEN_WRITE.scope,
    input: { token: 't1', platform: 'expo' }, unreadableInput: { token: 1, platform: 'expo' }, request: jest.mocked(notificationService.registerPushToken),
  },
  {
    name: 'path build start', write: START_TRACK_BUILD_WRITE, scope: START_TRACK_BUILD_WRITE.scope,
    input: { statement: 'I lead a team' }, unreadableInput: { statement: 5 }, request: jest.mocked(trackBuilderService.startBuild),
  },
];

/** The key a request was sent with: every service takes it last. */
function keySentBy(request: jest.Mock, call: number): unknown {
  return must(request.mock.calls[call], 'request call').at(-1);
}

/** Runs a write the way a screen does: its own scope, the tap's input and key in the variables. */
function start(client: QueryClient, write: WriteCase, key: string = KEY) {
  const options = client.defaultMutationOptions({
    mutationKey: write.write.mutationKey,
    ...(write.scope === undefined ? {} : { scope: { id: write.scope } }),
  });
  const mutation = client.getMutationCache().build(client, options);
  const done = mutation.execute({ input: write.input, idempotencyKey: key }).catch(() => undefined);
  return { mutation, done };
}

async function restart(): Promise<QueryClient> {
  const restored = appClient();
  await persistQueryClientRestore({ queryClient: restored, persister: writePersister, maxAge: PERSIST_MAX_AGE_MS });
  return restored;
}

describe.each(CASES)('the $name write', (c) => {
  beforeEach(async () => {
    jest.clearAllMocks();
    c.request.mockReset();
    c.request.mockResolvedValue(REPLY);
    await AsyncStorage.clear();
  });
  afterEach(() => onlineManager.setOnline(true));

  it('offline, sends nothing and shows no error; with signal back, sends once with the key it was made with', async () => {
    const client = appClient();
    onlineManager.setOnline(false);

    const { mutation, done } = start(client, c, newIdempotencyKey());
    await flush();

    expect(c.request).not.toHaveBeenCalled();
    expect(mutation.state.isPaused).toBe(true);
    expect(mutation.state.error).toBeNull();

    onlineManager.setOnline(true);
    await client.resumePausedMutations();
    await done;

    expect(c.request).toHaveBeenCalledTimes(1);
    expect(keySentBy(c.request, 0)).toMatch(UUID);
    expect(mutation.state.status).toBe('success');
  });

  it('online, sends once with an Idempotency-Key', async () => {
    const { done } = start(appClient(), c, newIdempotencyKey());
    await done;

    expect(c.request).toHaveBeenCalledTimes(1);
    expect(keySentBy(c.request, 0)).toMatch(UUID);
  });

  it.each([
    ['a network error', () => axiosError('ERR_NETWORK')],
    ['a timeout', () => axiosError('ECONNABORTED')],
    ['a 503', () => axiosError('ERR_BAD_RESPONSE', 503)],
    ['a 409 IDEMPOTENCY_IN_PROGRESS', () => axiosError('ERR_BAD_REQUEST', 409, { success: false, code: ERROR_CODES.IDEMPOTENCY_IN_PROGRESS })],
  ])('retries %s with the same key, and shows no error', async (_name, makeError) => {
    let failed = false;
    c.request.mockImplementation(() => {
      if (failed) return Promise.resolve(REPLY);
      failed = true;
      return Promise.reject(makeError());
    });

    const { mutation, done } = start(appClient(), c);
    await done;

    expect(c.request).toHaveBeenCalledTimes(2);
    expect(keySentBy(c.request, 0)).toBe(KEY);
    expect(keySentBy(c.request, 1)).toBe(KEY);
    expect(mutation.state.status).toBe('success');
    expect(mutation.state.error).toBeNull();
  });

  it('never retries a 404: it fails at once with that error', async () => {
    const notFound = axiosError('ERR_BAD_REQUEST', 404);
    c.request.mockImplementation(() => Promise.reject(notFound));

    const { mutation, done } = start(appClient(), c);
    await done;

    expect(c.request).toHaveBeenCalledTimes(1);
    expect(mutation.state.status).toBe('error');
    expect(mutation.state.error).toBe(notFound);
  });

  it('restored after a restart, sends the key it was made with', async () => {
    const before = appClient();
    onlineManager.setOnline(false);
    start(before, c);
    await flush();
    await saveToDevice(before);

    const after = await restart();
    expect(c.request).not.toHaveBeenCalled();

    onlineManager.setOnline(true);
    await after.resumePausedMutations();

    await waitFor(() => expect(c.request).toHaveBeenCalledTimes(1));
    expect(keySentBy(c.request, 0)).toBe(KEY);
  });

  it('refuses saved input it cannot read, and a saved write with no key, instead of sending a guess', async () => {
    await expect(Promise.resolve().then(() => c.write.mutationFn({ input: c.unreadableInput, idempotencyKey: KEY }))).rejects.toThrow();
    await expect(Promise.resolve().then(() => c.write.mutationFn({ input: c.input }))).rejects.toThrow('no idempotency key');
    expect(c.request).not.toHaveBeenCalled();
  });
});

describe('writes to one lesson', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    must(CASES[0], 'quiz case').request.mockReset();
  });
  afterEach(() => onlineManager.setOnline(true));

  it('three quiz answers made offline are sent in the order made, and a write on another lesson is not held behind them', async () => {
    const quiz = must(CASES[0], 'quiz case');
    const sent: string[] = [];
    const release = new Map<string, () => void>();
    // Each request waits until the test lets it finish, so what is held behind it shows.
    quiz.request.mockImplementation((lessonId: string, answers: Record<string, string>) => {
      const tag = `${lessonId}:${answers.n}`;
      sent.push(tag);
      return new Promise((resolve) => { release.set(tag, () => resolve(REPLY)); });
    });
    const client = appClient();
    onlineManager.setOnline(false);

    const writes = ['l1:1', 'l1:2', 'l1:3', 'l2:1'].map((tag) => {
      const [lessonId, n] = tag.split(':');
      return start(client, { ...quiz, scope: lessonWriteScope(must(lessonId, 'lesson')), input: { lessonId, answers: { n } } });
    });
    await flush();
    expect(sent).toEqual([]);

    onlineManager.setOnline(true);
    void client.resumePausedMutations();
    await flush();

    // The first answer on each lesson goes; the other two on lesson 1 wait for it.
    expect([...sent].sort()).toEqual(['l1:1', 'l2:1']);

    must(release.get('l1:1'), 'l1:1')();
    await flush();
    expect(sent.filter((tag) => tag.startsWith('l1'))).toEqual(['l1:1', 'l1:2']);

    must(release.get('l1:2'), 'l1:2')();
    await flush();
    expect(sent.filter((tag) => tag.startsWith('l1'))).toEqual(['l1:1', 'l1:2', 'l1:3']);

    must(release.get('l1:3'), 'l1:3')();
    must(release.get('l2:1'), 'l2:1')();
    await Promise.all(writes.map((w) => w.done));
  });
});

describe('a write restored after a restart', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockTrackService.setActivePath.mockResolvedValue(undefined);
    await AsyncStorage.clear();
  });
  afterEach(() => onlineManager.setOnline(true));

  async function restartPlain() {
    const restored = createTestQueryClient();
    registerSafeWrites(restored);
    await persistQueryClientRestore({ queryClient: restored, persister: writePersister, maxAge: PERSIST_MAX_AGE_MS });
    return restored;
  }

  it('brings back the paths it wrote to, sends the request when online, and runs the refetch on settle', async () => {
    const before = createTestQueryClient();
    const paths = [makeTrackPath({ id: 's1', isActive: false }), makeCustomPath({ id: 'p1', isActive: true })];
    before.setQueryData(PATHS_QUERY_KEY, paths);
    await pauseSetActiveWrite(before, ref);

    const after = await restartPlain();
    expect(after.getQueryData(PATHS_QUERY_KEY)).toEqual(paths);
    const invalidate = jest.spyOn(after, 'invalidateQueries');
    expect(mockTrackService.setActivePath).not.toHaveBeenCalled();

    onlineManager.setOnline(true);
    await after.resumePausedMutations();

    expect(mockTrackService.setActivePath).toHaveBeenCalledWith(ref);
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: PATHS_QUERY_KEY }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: SKILLS_QUERY_KEY });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ACHIEVEMENTS_QUERY_KEY });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: WEEK_QUERY_KEY });
  });

  it('refuses a saved write that has no path, instead of sending a guess', async () => {
    await expect(Promise.resolve().then(() => SET_ACTIVE_PATH_WRITE.mutationFn({ kind: 'custom' }))).rejects.toThrow('has no path');
    expect(mockTrackService.setActivePath).not.toHaveBeenCalled();
  });
});

describe('the quiz answer settle step', () => {
  it('refreshes the altitude, the achievements and the week with the paths, progress, lesson and track tree when a lesson is finalised', async () => {
    const client = createTestQueryClient();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const settle = must(SUBMIT_QUIZ_WRITE.settle, 'quiz settle step');
    await settle(client, { data: { lessonFinalized: true }, error: null, variables: { input: { lessonId: 'l1', answers: { q1: 'a' } }, idempotencyKey: KEY } });
    expect(invalidate.mock.calls.map(([filters]) => filters?.queryKey)).toEqual([
      PATHS_QUERY_KEY, PROGRESS_QUERY_KEY, lessonQueryKey('l1'), TRACK_CONTENTS_QUERY_KEY, ALTITUDE_QUERY_KEY, ACHIEVEMENTS_QUERY_KEY, WEEK_QUERY_KEY,
    ]);
  });

  it('refreshing the achievements leaves the unseen unlocks alone, so no celebration is fetched again', async () => {
    const client = createTestQueryClient();
    client.setQueryData(ACHIEVEMENTS_QUERY_KEY, null);
    client.setQueryData(UNSEEN_ACHIEVEMENTS_QUERY_KEY, null);
    await client.invalidateQueries({ queryKey: ACHIEVEMENTS_QUERY_KEY });
    expect(client.getQueryState(ACHIEVEMENTS_QUERY_KEY)?.isInvalidated).toBe(true);
    expect(client.getQueryState(UNSEEN_ACHIEVEMENTS_QUERY_KEY)?.isInvalidated).toBe(false);
  });
});

describe('the save settle step', () => {
  beforeEach(() => useCelebrationQueueStore.getState().clear());

  it('queues what saving a first lesson earned: the Pocketed step from the response', async () => {
    const client = createTestQueryClient();
    const pocketed = makeRewardUnlock('pocketed');
    const settle = must(SAVE_LESSON_WRITE.settle, 'save settle step');
    await settle(client, { data: { saved: true, rewards: makeRewards({ unlocked: [pocketed] }) }, error: null, variables: { input: { lessonId: 'l1' }, idempotencyKey: KEY } });
    expect(useCelebrationQueueStore.getState().queue).toEqual([pocketed]);
  });

  it('refreshes the saved lessons, the achievements (Pocketed, Magpie\'s count) and the week (Pocketed)', async () => {
    const client = createTestQueryClient();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const settle = must(SAVE_LESSON_WRITE.settle, 'save settle step');
    await settle(client, { data: { saved: true, rewards: makeRewards() }, error: null, variables: { input: { lessonId: 'l1' }, idempotencyKey: KEY } });
    expect(invalidate.mock.calls.map(([filters]) => filters?.queryKey)).toEqual([SAVED_LESSONS_QUERY_KEY, ACHIEVEMENTS_QUERY_KEY, WEEK_QUERY_KEY]);
  });

  it('an unsave refreshes the saved lessons and the achievements (Magpie\'s count)', async () => {
    const client = createTestQueryClient();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const settle = must(UNSAVE_LESSON_WRITE.settle, 'unsave settle step');
    await settle(client, { data: undefined, error: null, variables: { input: { lessonId: 'l1' }, idempotencyKey: KEY } });
    expect(invalidate.mock.calls.map(([filters]) => filters?.queryKey)).toEqual([SAVED_LESSONS_QUERY_KEY, ACHIEVEMENTS_QUERY_KEY]);
  });

  it('queues nothing when the save failed', async () => {
    const client = createTestQueryClient();
    const settle = must(SAVE_LESSON_WRITE.settle, 'save settle step');
    await settle(client, { data: undefined, error: new Error('no'), variables: { input: { lessonId: 'l1' }, idempotencyKey: KEY } });
    expect(useCelebrationQueueStore.getState().queue).toEqual([]);
  });

  it('a save restored after a restart queues its rewards through the same step', async () => {
    const client = appClient();
    jest.mocked(lessonService.saveLesson).mockResolvedValue({ saved: true, rewards: makeRewards({ unlocked: [makeRewardUnlock('pocketed')] }) });
    await startRegisteredWrite(client, SAVE_LESSON_WRITE, { input: { lessonId: 'l1' }, idempotencyKey: KEY });
    await waitFor(() => expect(useCelebrationQueueStore.getState().queue).toEqual([makeRewardUnlock('pocketed')]));
  });
});

describe('the "seen" settle step', () => {
  const seen = (key: string) => ({ data: undefined, error: null, variables: { input: { key }, idempotencyKey: KEY } });

  it('refreshes the altitude when a landmark was marked seen, so the badge slot moves on', async () => {
    const client = createTestQueryClient();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    await must(MARK_ACHIEVEMENT_SEEN_WRITE.settle, 'seen settle step')(client, seen('yr-wyddfa'));
    expect(invalidate.mock.calls.map(([filters]) => filters?.queryKey)).toEqual([ALTITUDE_QUERY_KEY]);
  });

  it('leaves the altitude alone when a medal was marked seen', async () => {
    const client = createTestQueryClient();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    await must(MARK_ACHIEVEMENT_SEEN_WRITE.settle, 'seen settle step')(client, seen('first-light'));
    expect(invalidate).not.toHaveBeenCalled();
  });
});

describe('the notification preferences restore guard (124af)', () => {
  const RECAP_TIME = formatPreferredTime({ hour: 19, minute: 30 });
  const restore = (input: unknown) => Promise.resolve().then(() => UPDATE_PREFERENCES_WRITE.mutationFn({ input, idempotencyKey: KEY }));

  beforeEach(() => {
    jest.mocked(notificationService.updatePreferences).mockReset();
    jest.mocked(notificationService.updatePreferences).mockResolvedValue(makeNotificationPreference());
  });

  it('sends the recap switch and its time as saved', async () => {
    await restore({ enableWeeklyRecap: false, weeklyRecapTime: RECAP_TIME });
    expect(notificationService.updatePreferences).toHaveBeenCalledWith({ enableWeeklyRecap: false, weeklyRecapTime: RECAP_TIME }, KEY);
  });

  it.each([
    ['not a string', 5],
    ['not a time of day', '7pm'],
  ])('refuses a recap time that is %s', async (_name, weeklyRecapTime) => {
    await expect(restore({ weeklyRecapTime })).rejects.toThrow();
    expect(notificationService.updatePreferences).not.toHaveBeenCalled();
  });
});
