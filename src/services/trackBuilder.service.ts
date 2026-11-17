import api from '@/lib/api';
import type {
  RequestChunk, CreateTrackBuildRequest, RefinePlanRequest, CreateTrackPlanRequest, UpdateTrackPlanRequest, BuiltPlanTopic, RefinedPlan, TrackBuild, TrackBuildList, TrackPlan,
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
  /**
   * Starts a path build in the background (ADR-020). The id, last as every safe write's key is, is the client's,
   * so sending it again returns the same build; the outcome is read with `getBuild`.
   */
  async startBuild(statement: string, id: string): Promise<TrackBuild> {
    const body: CreateTrackBuildRequest = { id, statement };
    const { data } = await api.post<TrackBuild>('/track-builder/builds', body);
    return data;
  },

  /** One build and what it has come to so far. Owner only. */
  async getBuild(id: string): Promise<TrackBuild> {
    const { data } = await api.get<TrackBuild>(`/track-builder/builds/${id}`);
    return data;
  },

  /** The finished builds the person has not been shown yet. The server holds the list, so a reinstall or a second phone finds them too (ADR-020 Decision 7). */
  async listUnseenBuilds(): Promise<TrackBuild[]> {
    const { data } = await api.get<TrackBuildList>('/track-builder/builds', { params: { unseen: true } });
    return data.builds;
  },

  /** Records that the person has been shown a finished build. Sending it again is harmless. */
  async markBuildSeen(id: string): Promise<void> {
    await api.post(`/track-builder/builds/${id}/seen`);
  },

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
