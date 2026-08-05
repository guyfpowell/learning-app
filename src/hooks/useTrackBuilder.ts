import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { trackBuilderService } from '@/services/trackBuilder.service';
import type { BuiltPlanTopic, TrackPlanTopic, TrackBuilderTurn } from '@/services/trackBuilder.service';

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

export function useRefinePlan() {
  return useMutation({
    mutationFn: (v: { statement: string; plan: BuiltPlanTopic[]; sessionId?: string | null }) =>
      trackBuilderService.refinePlan(v.statement, v.plan, v.sessionId),
  });
}

export function useCreateTrackPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (v: {
      name: string;
      planJson: { topics: TrackPlanTopic[] };
      inputJson: { turns: TrackBuilderTurn[]; maxClosureHops?: number | null };
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

