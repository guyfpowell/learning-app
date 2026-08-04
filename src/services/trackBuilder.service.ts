import api from '@/lib/api';

/**
 * Track builder — ticket 049 Chunk 5.
 *
 * Mobile carries **no model**. Inference runs on the API, so this is ordinary
 * HTTP: no `onnxruntime-react-native`, no 22MB asset in the bundle, no second
 * tokenizer to drift out of step with the Python one. The server owns the
 * classifier, the bridge and the refinement logic; the app owns screens.
 *
 * Types mirror the web client deliberately rather than being imported from it —
 * `@learning/shared` holds the engine, and these are the API's response shapes.
 */

export interface BuiltPlanTopic {
  stableKey: string;
  order: number;
  topicName: string;
  level: string;
  reason?: string;
  /** null means the planner added it as groundwork, not the model. */
  area: string | null;
  hops: number;
}

export interface BuiltPlan {
  shouldAsk: boolean;
  name: string;
  level: string;
  levelConfidence: number;
  intent: string;
  intentConfidence: number;
  firedAreas: { name: string; p: number }[];
  topics: BuiltPlanTopic[];
}

/**
 * What a follow-up did. `action` is decided server-side so the rule that
 * protects the plan — a control intent must never rebuild it — cannot be
 * forgotten in a UI, on either platform.
 */
export interface RefinedPlan {
  intent: string;
  intentConfidence: number;
  action: 'refine' | 'accept' | 'restart' | 'reject' | 'replace' | 'unhandled';
  clauses: { text: string; polarity: string }[];
  plan: BuiltPlanTopic[];
  removed: { stableKey: string; clause: string; sim: number }[];
  refusedEmpty?: boolean;
  rebuilt?: BuiltPlan;
}

export interface TrackPlanTopic {
  stableKey: string;
  order: number;
  reason?: string;
  area?: string;
  hops?: number;
}

export interface TrackPlan {
  id: string;
  name: string;
  status: 'active' | 'archived';
  planJson: { topics: TrackPlanTopic[] };
  createdAt: string;
  updatedAt: string;
}

export interface TrackBuilderTurn {
  text: string;
  intent?: string;
  intentConfidence?: number;
  level?: string | null;
  levelConfidence?: number;
  planSize?: number;
  shouldAsk?: boolean;
  at?: string;
}

export const trackBuilderService = {
  /** Statement in, finished plan out. */
  async buildPlan(statement: string, maxClosureHops?: number | null): Promise<BuiltPlan> {
    const { data } = await api.post<BuiltPlan>('/track-builder/plan', {
      statement,
      maxClosureHops: maxClosureHops ?? null,
    });
    return data;
  },

  async refinePlan(statement: string, plan: BuiltPlanTopic[]): Promise<RefinedPlan> {
    const { data } = await api.post<RefinedPlan>('/track-builder/refine', { statement, plan });
    return data;
  },

  async startSession(turn: TrackBuilderTurn): Promise<{ id: string }> {
    const { data } = await api.post<{ id: string }>('/track-builder/sessions', { turn });
    return data;
  },

  async appendTurn(sessionId: string, turn: TrackBuilderTurn): Promise<void> {
    await api.put(`/track-builder/sessions/${sessionId}`, { turn });
  },

  async createPlan(input: {
    name: string;
    planJson: { topics: TrackPlanTopic[] };
    inputJson: { turns: TrackBuilderTurn[]; maxClosureHops?: number | null };
  }): Promise<TrackPlan> {
    const { data } = await api.post<TrackPlan>('/track-plans', input);
    return data;
  },

  async getPlans(): Promise<TrackPlan[]> {
    const { data } = await api.get<TrackPlan[]>('/track-plans');
    return data;
  },
};
