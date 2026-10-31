import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { trackBuilderService } from '@/services/trackBuilder.service';
import { errorCode } from '@/lib/errors';
import { CURRENT_USER_QUERY_KEY, PATHS_QUERY_KEY, TRACK_CONTENTS_QUERY_KEY, TRACK_PLANS_QUERY_KEY } from '@/lib/queryKeys';
import { ERROR_CODES, type BuildPlanRequest, type CreateTrackPlanRequest, type RefinePlanRequest, type UpdateTrackPlanRequest } from '@learning/shared';

/**
 * Track builder hooks — ticket 049 Chunk 5.
 *
 * Building and refining are mutations, not queries: they are user actions with
 * side effects on the server (every turn is recorded), and caching them by
 * statement would silently return a stale plan after a retrain.
 */

export function useBuildPlan() {
  return useMutation({
    mutationFn: (v: BuildPlanRequest) => trackBuilderService.buildPlan(v.statement, v.sessionId),
  });
}

// `useAnswerChunk` and `useNegateChunk` went on 2026-09-08 — 068 Chunk 6b,
// with the question loop they drove. Refinement stays: it runs on cue words
// ("take out", "drop", "keep"), which never needed the model.

export function useRefinePlan() {
  return useMutation({
    mutationFn: (v: RefinePlanRequest) =>
      trackBuilderService.refinePlan(v.statement, v.plan, v.sessionId, v.chunks),
  });
}

export function useCreateTrackPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (v: CreateTrackPlanRequest) => trackBuilderService.createPlan(v),
    onSuccess: () => {
      // Custom plans take precedence on the home surface, so both caches move.
      void queryClient.invalidateQueries({ queryKey: TRACK_PLANS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: PATHS_QUERY_KEY });
    },
    // A save spends the free Albert allowance, and a refused one (ALBERT_ALLOWANCE_USED)
    // means the cached count was stale: either way /me's `albertAllowance` has moved (079a).
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
    },
  });
}

export function useTrackPlans() {
  return useQuery({
    queryKey: TRACK_PLANS_QUERY_KEY,
    queryFn: () => trackBuilderService.getPlans(),
  });
}

/** Archive or rename a custom plan via `PUT /track-plans/:id`. Invalidates the same plan
 *  and enrollment keys as `useCreateTrackPlan` so Paths, Home and Tracks all refresh, and
 *  the track screens, which show the name.
 *  Not /me on success: neither archiving nor renaming gives back the Albert allowance (079a). The trial-over 409
 *  (079i3) means the cached session was stale, so /me is read again and never retried. */
export function useUpdateTrackPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string } & (
      Required<Pick<UpdateTrackPlanRequest, 'status'>> | Required<Pick<UpdateTrackPlanRequest, 'name'>>
    )) => trackBuilderService.updateTrackPlan(id, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TRACK_PLANS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: PATHS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: TRACK_CONTENTS_QUERY_KEY });
    },
    onError: err => {
      if (errorCode(err) === ERROR_CODES.FRESH_PATH_TRIAL_OVER) void queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
    },
  });
}

