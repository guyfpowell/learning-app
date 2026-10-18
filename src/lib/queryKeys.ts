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

/** Every cached lesson (`GET /lessons/:id`); invalidate it when access or completion changes for all of them. */
export const LESSONS_QUERY_KEY = ['lesson'] as const;

/** One cached lesson. Invalidate it when a write changes its user state (a pass finished or started). */
export function lessonQueryKey(lessonId: string) {
  return [...LESSONS_QUERY_KEY, lessonId] as const;
}

/** The user's progress summary (`GET /users/progress`). */
export const PROGRESS_QUERY_KEY = ['progress'] as const;

/** Every cached track-contents tree; one tree is `[...TRACK_CONTENTS_QUERY_KEY, kind, id]`. */
export const TRACK_CONTENTS_QUERY_KEY = ['track-contents'] as const;
