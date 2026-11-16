import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Sentry from '@sentry/react-native';
import { trackService, type SkipCall } from '@/services/track.service';
import { SET_ACTIVE_PATH_ERROR } from '@learning/shared';
import type { ActivePathRef, SkipReason, SkipScope, TopicFeedbackRequest, UserPath, UserPathKind } from '@learning/shared';
import { PATHS_QUERY_KEY, SKILLS_QUERY_KEY, TRACK_CONTENTS_QUERY_KEY } from '@/lib/queryKeys';
import { SET_ACTIVE_PATH_WRITE } from '@/lib/safeWrites';
import { requireSignal } from '@/lib/offlineWrites';
import { invalidatePathQueries } from '@/lib/pathInvalidation';
import { useOptimisticMutation } from '@/hooks/useOptimisticMutation';

export function useSkills() {
  return useQuery({
    queryKey: SKILLS_QUERY_KEY,
    queryFn: () => trackService.getSkills(),
  });
}

/**
 * Every path the user is learning from, of both kinds, active first (ADR-009 C2).
 *
 * There is deliberately no `useCustomPlans` counterpart: a custom path is a path
 * like any other, and a hook that returned only one kind would invite screens to
 * branch on kind again.
 */
export function usePaths() {
  return useQuery({
    queryKey: PATHS_QUERY_KEY,
    queryFn: loadPaths,
  });
}

/** The paths fetch, logged on failure; callers show `PATHS_LOAD_ERROR` from the query's error state. */
async function loadPaths(): Promise<UserPath[]> {
  try {
    return await trackService.getPaths();
  } catch (err) {
    Sentry.addBreadcrumb({ category: 'paths', message: 'Paths load failed', level: 'warning', data: { err: String(err) } });
    throw err;
  }
}

/**
 * Invalidate everything a path change can affect. Returns a promise that settles once the
 * refetches land, so a mutation returning it stays pending until the screen shows the new state.
 */
function usePathInvalidation() {
  const queryClient = useQueryClient();
  return () => invalidatePathQueries(queryClient);
}

export function useEnroll() {
  const invalidate = usePathInvalidation();
  return useMutation({
    // Not safe to send twice: with no signal it fails at once (ADR-021 Decision 6).
    mutationFn: (skillId: string) => requireSignal(() => trackService.enroll(skillId)),
    onSuccess: invalidate,
  });
}

/**
 * "Make active" changes the screen at once (ADR-019): the tapped path shows active and every other
 * path not, and the request follows in the background. The server is certain to produce exactly
 * that from the person's own tap, and setting the same path active twice is safe.
 */
export function useSetActivePath() {
  const mutation = useOptimisticMutation<ActivePathRef, UserPath[]>({
    write: SET_ACTIVE_PATH_WRITE,
    expected: (paths, ref) => paths.map((path) => ({ ...path, isActive: path.kind === ref.kind && path.id === ref.id })),
    failureMessage: SET_ACTIVE_PATH_ERROR,
  });
  return {
    setActive: mutation.mutate,
    failure: mutation.failure,
    dismissFailure: mutation.dismissFailure,
    /** True while a call for this path is in flight, so a second tap on it can be ignored. */
    isPendingFor: (ref: ActivePathRef) => mutation.isInFlight((v) => v.kind === ref.kind && v.id === ref.id),
  };
}

/**
 * One skip mutation for every scope (lesson, topic, level). `pendingScope(path)` is the scope
 * in flight on that path, so only the pressed button on the pressed card spins.
 */
export function useSkip() {
  const invalidate = usePathInvalidation();
  const mutation = useMutation({
    mutationFn: (call: SkipCall) => requireSignal(() => trackService.skip(call)),
    onSuccess: invalidate,
  });
  const inFlight = mutation.isPending ? mutation.variables : undefined;
  return {
    /** `onDone` runs once the server has taken the skip, for a message to the person. */
    skip: (path: UserPath, scope: SkipScope, reason: SkipReason, onDone?: () => void) =>
      mutation.mutate({ kind: path.kind, id: path.id, scope, reason }, onDone ? { onSuccess: onDone } : undefined),
    pendingScope: (path: UserPath): SkipScope | null =>
      inFlight?.kind === path.kind && inFlight.id === path.id ? inFlight.scope : null,
    error: mutation.error,
  };
}

/**
 * Writes the end-of-topic answer (079d). It deliberately does not refetch paths on success:
 * the refetch clears `topicEnd`, which would unmount the screen before it shows its
 * acknowledgement. The caller calls `refreshPaths` when the screen closes.
 */
export function useTopicFeedback() {
  const mutation = useMutation({
    mutationFn: ({ planId, body }: { planId: string; body: TopicFeedbackRequest }) =>
      requireSignal(() => trackService.topicFeedback(planId, body)),
  });
  return { submit: (planId: string, body: TopicFeedbackRequest) => mutation.mutateAsync({ planId, body }) };
}

/**
 * Refetches the paths so a written `topicEnd` comes back null. Fire-and-forget: a failed
 * refetch lands in the query's own error state, which `usePaths` callers show.
 */
export function useRefreshPaths() {
  const queryClient = useQueryClient();
  return () => { void queryClient.invalidateQueries({ queryKey: PATHS_QUERY_KEY }); };
}

/**
 * Full lesson tree for a path of either kind. A finished lesson invalidates every tree (the quiz
 * answer's settle step, `SUBMIT_QUIZ_WRITE`), so the tree shows progress when the user returns.
 */
export function useTrackContents(kind: UserPathKind, id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...TRACK_CONTENTS_QUERY_KEY, kind, id],
    queryFn: () => trackService.getTrackContents(kind, id),
    enabled: (options?.enabled ?? true) && !!kind && !!id,
  });
}
