import api from '@/lib/api';
import type {
  RequestChunk, BuildPlanRequest, RefinePlanRequest, CreateTrackPlanRequest, UpdateTrackPlanRequest, BuiltPlan, BuiltPlanTopic, RefinedPlan, TrackPlanTopic, TrackPlan, TrackBuilderTurn,
} from '@learning/shared';

/**
 * Track builder — ticket 049 Chunk 5.
 *
 * Mobile carries **no model**. Inference runs on the API, so this is ordinary
 * HTTP: no `onnxruntime-react-native`, no 22MB asset in the bundle, no second
 * tokenizer to drift out of step with the Python one. The server owns the
 * classifier, the bridge and the refinement logic; the app owns screens.
 *
 * The wire types come from `@learning/shared`, the same ones the API returns.
 */

export const trackBuilderService = {
  /** The server records the turn; the client only carries the session id back. */
  async buildPlan(
    statement: string, maxClosureHops?: number | null, sessionId?: string | null,
  ): Promise<BuiltPlan> {
    const body: BuildPlanRequest = {
      statement,
      maxClosureHops: maxClosureHops ?? null,
      sessionId: sessionId ?? null,
    };
    const { data } = await api.post<BuiltPlan>('/track-builder/plan', body);
    return data;
  },

  /**
   * Answer ONE open request. The others are untouched — an answer about which
   * parts of AI says nothing about what understanding a tech lead means.
   */
  // `answerChunk` and `negateChunk` went on 2026-09-08 — 068 Chunk 6b. The
  // routes behind them went with the local classifier's question loop.

  /**
   * Apply a follow-up to an existing plan.
   *
   * `action` is decided server-side so the rule that protects the plan — a
   * control intent must never rebuild it — cannot be forgotten in a UI, on
   * either platform.
   */
  async refinePlan(
    statement: string, plan: BuiltPlanTopic[], sessionId?: string | null,
    chunks: RequestChunk[] = [],
  ): Promise<RefinedPlan> {
    const body: RefinePlanRequest = { statement, plan, sessionId: sessionId ?? null, chunks };
    const { data } = await api.post<RefinedPlan>('/track-builder/refine', body);
    return data;
  },

  async createPlan(input: CreateTrackPlanRequest): Promise<TrackPlan> {
    const { data } = await api.post<TrackPlan>('/track-plans', input);
    return data;
  },

  async getPlans(): Promise<TrackPlan[]> {
    const { data } = await api.get<TrackPlan[]>('/track-plans');
    return data;
  },

  /** Archive (soft-delete) a plan. `PUT /track-plans/:id` — not PATCH; validated
   *  by `updatePlanSchema` which already accepts `status`. */
  async updateTrackPlan(id: string, patch: UpdateTrackPlanRequest): Promise<TrackPlan> {
    const { data } = await api.put<TrackPlan>(`/track-plans/${id}`, patch);
    return data;
  },
};
