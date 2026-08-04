import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Sentry from '@sentry/react-native';
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
    mutationFn: (v: { statement: string; maxClosureHops?: number | null }) =>
      trackBuilderService.buildPlan(v.statement, v.maxClosureHops),
  });
}

export function useRefinePlan() {
  return useMutation({
    mutationFn: (v: { statement: string; plan: BuiltPlanTopic[] }) =>
      trackBuilderService.refinePlan(v.statement, v.plan),
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

/**
 * Record a turn.
 *
 * Fire-and-forget for the USER — a plan they can see is worth more than our
 * record of it — but never silent for us. Swallowing the error made a totally
 * broken write (missing table) look identical to a working one, which is how
 * the first real test went unlogged.
 */
export function useRecordTurn() {
  return async (sessionId: string | null, turn: TrackBuilderTurn): Promise<string | null> => {
    try {
      if (sessionId) {
        await trackBuilderService.appendTurn(sessionId, turn);
        return sessionId;
      }
      const { id } = await trackBuilderService.startSession(turn);
      return id;
    } catch (err) {
      console.error('[track-builder] failed to record turn — this statement is lost', err);
      Sentry.captureException(err, { tags: { area: 'track-builder', op: 'record-turn' } });
      return sessionId;
    }
  };
}
