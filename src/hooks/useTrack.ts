import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { trackService } from '@/services/track.service';
import type { ActivePathRef, UserPathKind } from '@learning/shared';

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
    queryKey: ['enrollments'],
    queryFn: () => trackService.getPaths(),
  });
}

/** Invalidate everything a path change can affect. */
function usePathInvalidation() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    queryClient.invalidateQueries({ queryKey: ['skills'] });
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

export function useSkipTopic() {
  const invalidate = usePathInvalidation();
  return useMutation({
    mutationFn: (ref: ActivePathRef) => trackService.skipTopic(ref),
    onSuccess: invalidate,
  });
}

export function useSkipLevel() {
  const invalidate = usePathInvalidation();
  return useMutation({
    mutationFn: (ref: ActivePathRef) => trackService.skipLevel(ref),
    onSuccess: invalidate,
  });
}

/** Skips exactly the next lesson of either kind of path (076h). */
export function useSkipLesson() {
  const invalidate = usePathInvalidation();
  return useMutation({
    mutationFn: (ref: ActivePathRef) => trackService.skipLesson(ref),
    onSuccess: invalidate,
  });
}

/**
 * Full lesson tree for a path of either kind. Invalidated by lesson completion
 * so the tree reflects progress when the user returns from a lesson.
 * Query key prefix: ['track-contents'] — useSubmitQuiz invalidates this prefix.
 */
export function useTrackContents(kind: UserPathKind, id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['track-contents', kind, id],
    queryFn: () => trackService.getTrackContents(kind, id),
    enabled: (options?.enabled ?? true) && !!kind && !!id,
  });
}
