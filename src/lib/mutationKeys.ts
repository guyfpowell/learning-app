/**
 * Mutation keys and scope ids for the writes that use the patchy-signal mechanism (ADR-019,
 * ADR-021). One key per action; writes that touch the same thing share one scope, so their
 * requests go one at a time, in the order made. Their own module, not a hook's: screen tests mock
 * hook modules with factories.
 */

/** "Make active" on a path of either kind (`PATCH /enrollments/active`). */
export const SET_ACTIVE_PATH_MUTATION_KEY = ['set-active-path'] as const;

/** Every optimistic write to the paths cache (`PATHS_QUERY_KEY`). */
export const PATHS_WRITE_SCOPE = 'paths-write';

/** A quiz answer (`POST /lessons/:id/quiz`). */
export const SUBMIT_QUIZ_MUTATION_KEY = ['submit-quiz'] as const;

/** The reading position (`PATCH /lessons/:id/position`). */
export const SAVE_POSITION_MUTATION_KEY = ['save-position'] as const;

/** A thumb on a completed lesson (`PUT /lessons/:id/rating`). */
export const SET_RATING_MUTATION_KEY = ['set-rating'] as const;

/** Save and unsave a lesson (`POST` / `DELETE /lessons/:id/save`). */
export const SAVE_LESSON_MUTATION_KEY = ['save-lesson'] as const;
export const UNSAVE_LESSON_MUTATION_KEY = ['unsave-lesson'] as const;

/** Every write to one lesson (answers, position, rating, save), sent in the order made. */
export function lessonWriteScope(lessonId: string): string {
  return `lesson-write:${lessonId}`;
}

/** Notification preferences (`PATCH /notifications/preferences`). */
export const UPDATE_PREFERENCES_MUTATION_KEY = ['update-preferences'] as const;
export const PREFERENCES_WRITE_SCOPE = 'preferences-write';

/** The profile (`PATCH /users/profile`). */
export const UPDATE_PROFILE_MUTATION_KEY = ['update-profile'] as const;
export const PROFILE_WRITE_SCOPE = 'profile-write';

/** The push token (`POST /notifications/push-token`). */
export const PUSH_TOKEN_MUTATION_KEY = ['push-token'] as const;
export const PUSH_TOKEN_WRITE_SCOPE = 'push-token-write';

/** Starting a path build (`POST /track-builder/builds`). The idempotency key made at the tap is the build's id (ADR-020 Decision 5, ADR-021 Amendment 1). */
export const START_TRACK_BUILD_MUTATION_KEY = ['start-track-build'] as const;

/** Marking an unlock seen after its celebration is dismissed (`POST /achievements/:key/seen`). */
export const MARK_ACHIEVEMENT_SEEN_MUTATION_KEY = ['mark-achievement-seen'] as const;
