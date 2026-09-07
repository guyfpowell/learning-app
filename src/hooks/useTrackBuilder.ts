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

/**
 * Answer one open request. A mutation for the same reason building is: the
 * server records the turn, and there is nothing here worth caching.
 */
export function useAnswerChunk() {
  return useMutation({
    mutationFn: (v: {
      chunks: RequestChunk[]; chunkId: string; answer: string; sessionId?: string | null;
    }) => trackBuilderService.answerChunk(v.chunks, v.chunkId, v.answer, v.sessionId),
  });
}

/** The only turn that removes a request. */
export function useNegateChunk() {
  return useMutation({
    mutationFn: (v: { chunks: RequestChunk[]; negated: string; sessionId?: string | null }) =>
      trackBuilderService.negateChunk(v.chunks, v.negated, v.sessionId),
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

