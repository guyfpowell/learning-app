import type { UserPathKind } from '@learning/shared';

/**
 * The cache key for the signed-in user (`GET /auth/me`). Invalidate it when a write
 * changes what /me reports. Its own module, not the hook's: screen tests mock
 * `@/hooks/useEmailVerification` with a factory, which would make it undefined.
 */
export const CURRENT_USER_QUERY_KEY = ['auth', 'me'] as const;

/**
 * The cache key for every path the user is learning from (`GET /enrollments`). Invalidate it when
 * a write changes progress, a path or a topic end. Its own module for the same reason as above.
 */
export const PATHS_QUERY_KEY = ['enrollments'] as const;

/** The track catalogue with the user's access to each (`GET /lessons/skills`). Invalidate it on a path change. */
export const SKILLS_QUERY_KEY = ['skills'] as const;

/** The user's saved Albert plans (`GET /track-plans`). Invalidate it when a plan is created or archived. */
export const TRACK_PLANS_QUERY_KEY = ['track-plans'] as const;

/** One custom path's pending proposal (`GET /track-plans/:id/proposal`). */
export function proposalQueryKey(planId: string) {
  return ['proposal', planId] as const;
}

/** One custom path's latest situation change and its outcome (`GET /track-plans/:id/situation-changes/latest`). */
export function situationChangeQueryKey(planId: string) {
  return ['situation-change', planId] as const;
}

/** Every cached lesson (`GET /lessons/:id`); invalidate it when access or completion changes for all of them. */
export const LESSONS_QUERY_KEY = ['lesson'] as const;

/** One cached lesson. Invalidate it when a write changes its user state (a pass finished or started). */
export function lessonQueryKey(lessonId: string) {
  return [...LESSONS_QUERY_KEY, lessonId] as const;
}

/** The user's saved lessons (`GET /lessons/saved`). Invalidate it when a lesson is saved or unsaved. */
export const SAVED_LESSONS_QUERY_KEY = ['lessons', 'saved'] as const;

/** The user's profile (`useProfile`). Invalidate it when a write changes entitlement. */
export const USER_PROFILE_QUERY_KEY = ['user-profile'] as const;

/** The user's notification preferences (`GET /notifications/preferences`). */
export const NOTIFICATION_PREFERENCES_QUERY_KEY = ['notifications', 'preferences'] as const;

/** The user's progress summary (`GET /users/progress`). */
export const PROGRESS_QUERY_KEY = ['progress'] as const;

/** The App Store offering with its monthly and annual packages (RevenueCat). */
export const IAP_OFFERINGS_QUERY_KEY = ['iap', 'offerings'] as const;

/** What deleting the account would cancel (`GET /users/me/delete-preflight`). */
export const DELETE_PREFLIGHT_QUERY_KEY = ['delete-preflight'] as const;

/** Every cached track-contents tree; one tree is `trackContentsQueryKey(kind, id)`. */
export const TRACK_CONTENTS_QUERY_KEY = ['track-contents'] as const;

/** One path's cached contents tree (`GET /enrollments/:kind/:id/contents`). */
export function trackContentsQueryKey(kind: UserPathKind, id: string) {
  return [...TRACK_CONTENTS_QUERY_KEY, kind, id] as const;
}

/** One path build and its outcome (`GET /track-builder/builds/:id`); `undefined` before a build has been started. */
export function trackBuildQueryKey(buildId: string | undefined) {
  return ['track-build', buildId] as const;
}

/** The user's finished path builds not yet shown to them (`GET /track-builder/builds?unseen=true`). It drives the Albert tab's badge and entry. */
export const UNSEEN_BUILDS_QUERY_KEY = ['track-builds', 'unseen'] as const;

/**
 * The ladders and the Trailhead (`GET /achievements`). Every write that can earn a medal or move a
 * rung's count invalidates it. Not a prefix of the unseen key, so refreshing it never fetches the
 * celebrations again.
 */
export const ACHIEVEMENTS_QUERY_KEY = ['achievements', 'ladders'] as const;

/** The achievements the person has unlocked but not been shown (`GET /achievements/unseen`). The celebration queue reads it on start, on foreground and when a finished build is shown. */
export const UNSEEN_ACHIEVEMENTS_QUERY_KEY = ['achievements', 'unseen'] as const;

/** The user's metres and level (`GET /users/altitude`). Invalidate it when a lesson pays. */
export const ALTITUDE_QUERY_KEY = ['altitude'] as const;
