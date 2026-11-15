/**
 * Mutation keys and scope ids for the optimistic writes (ADR-019). One key per action; writes
 * that touch the same cache keys share one scope, so their requests go one at a time, in the
 * order tapped. Their own module, not a hook's: screen tests mock hook modules with factories.
 */

/** "Make active" on a path of either kind (`PATCH /enrollments/active`). */
export const SET_ACTIVE_PATH_MUTATION_KEY = ['set-active-path'] as const;

/** Every optimistic write to the paths cache (`PATHS_QUERY_KEY`). */
export const PATHS_WRITE_SCOPE = 'paths-write';
