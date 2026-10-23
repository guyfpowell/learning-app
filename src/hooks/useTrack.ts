import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { trackService, type SkipCall } from '@/services/track.service';
import type { ActivePathRef, SkipReason, SkipScope, TopicFeedbackRequest, UserPath, UserPathKind } from '@learning/shared';
import { PATHS_QUERY_KEY, TRACK_CONTENTS_QUERY_KEY } from '@/lib/queryKeys';

export function useSkills() {
  return useQuery({
    queryKey: ['skills'],
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
    queryFn: () => trackService.getPaths(),
  });
}

/** Invalidate everything a path change can affect. */
function usePathInvalidation() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: PATHS_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: ['skills'] });
  };
}

export function useEnroll() {
  const invalidate = usePathInvalidation();
  return useMutation({
    mutationFn: (skillId: string) => trackService.enroll(skillId),
    onSuccess: invalidate,
  });
}

export function useSetActivePath() {
  const invalidate = usePathInvalidation();
  return useMutation({
    mutationFn: (ref: ActivePathRef) => trackService.setActivePath(ref),
    onSuccess: invalidate,
  });
}

export function useRemovePath() {
  const invalidate = usePathInvalidation();
  return useMutation({
    mutationFn: (ref: ActivePathRef) => trackService.removePath(ref),
    onSuccess: invalidate,
  });
}

/**
 * One skip mutation for every scope (lesson, topic, level). `pendingScope(path)` is the scope
 * in flight on that path, so only the pressed button on the pressed card spins.
 */
export function useSkip() {
  const invalidate = usePathInvalidation();
  const mutation = useMutation({
    mutationFn: (call: SkipCall) => trackService.skip(call),
    onSuccess: invalidate,
  });
  const inFlight = mutation.isPending ? mutation.variables : undefined;
  return {
    skip: (path: UserPath, scope: SkipScope, reason: SkipReason) =>
      mutation.mutate({ kind: path.kind, id: path.id, scope, reason }),
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
      trackService.topicFeedback(planId, body),
  });
  return { submit: (planId: string, body: TopicFeedbackRequest) => mutation.mutateAsync({ planId, body }) };
}

/** Refetches the paths so a written `topicEnd` comes back null. */
export function useRefreshPaths() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: PATHS_QUERY_KEY });
}

/**
 * Full lesson tree for a path of either kind. Invalidated by lesson completion
 * so the tree reflects progress when the user returns from a lesson.
 * Query key prefix: ['track-contents'] — useSubmitQuiz invalidates this prefix.
 */
export function useTrackContents(kind: UserPathKind, id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...TRACK_CONTENTS_QUERY_KEY, kind, id],
    queryFn: () => trackService.getTrackContents(kind, id),
    enabled: (options?.enabled ?? true) && !!kind && !!id,
  });
}
