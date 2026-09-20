import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { trackBuilderService } from '@/services/trackBuilder.service';
import type {
  BuiltPlanTopic, TrackPlanTopic, TrackBuilderTurn, RequestChunk,
} from '@/services/trackBuilder.service';

/**
 * Track builder hooks — ticket 049 Chunk 5.
 *
 * Building and refining are mutations, not queries: they are user actions with
 * side effects on the server (every turn is recorded), and caching them by
 * statement would silently return a stale plan after a retrain.
 */

export function useBuildPlan() {
  return useMutation({
    mutationFn: (v: { statement: string; maxClosureHops?: number | null; sessionId?: string | null }) =>
      trackBuilderService.buildPlan(v.statement, v.maxClosureHops, v.sessionId),
  });
}

// `useAnswerChunk` and `useNegateChunk` went on 2026-09-08 — 068 Chunk 6b,
// with the question loop they drove. Refinement stays: it runs on cue words
// ("take out", "drop", "keep"), which never needed the model.

export function useRefinePlan() {
  return useMutation({
    mutationFn: (v: {
      statement: string;
      plan: BuiltPlanTopic[];
      sessionId?: string | null;
      chunks?: RequestChunk[];
    }) => trackBuilderService.refinePlan(v.statement, v.plan, v.sessionId, v.chunks),
  });
}

export function useCreateTrackPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (v: {
      name: string;
      description?: string | null;
      planJson: { topics: TrackPlanTopic[] };
      inputJson: { turns: TrackBuilderTurn[]; maxClosureHops?: number | null };
      /** Which engine built it — 068 Chunk 4. */
      classifierEngine?: 'local' | 'claude' | 'local-fallback' | null;
    }) => trackBuilderService.createPlan(v),
    onSuccess: () => {
      // Custom plans take precedence on the home surface, so both caches move.
      queryClient.invalidateQueries({ queryKey: ['track-plans'] });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    },
  });
}

export function useTrackPlans() {
  return useQuery({
    queryKey: ['track-plans'],
    queryFn: () => trackBuilderService.getPlans(),
  });
}

/** Archive a custom plan via `PUT /track-plans/:id`. Invalidates the same
 *  query keys as `useCreateTrackPlan` so Paths, Home and Tracks all refresh. */
export function useUpdateTrackPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string; status: 'archived' }) =>
      trackBuilderService.updateTrackPlan(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['track-plans'] });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    },
  });
}

