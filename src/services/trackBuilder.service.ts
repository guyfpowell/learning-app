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
  /**
   * `RequestChunk.id` of the request that asked for this topic. Null means
   * nobody did directly — dependency closure pulled it in as groundwork.
   */
  request?: string | null;
  /** The same value under its old name. */
  area: string | null;
  hops: number;
}

/**
 * One request the statement broke into, and where it has got to.
 *
 * A statement is not one ask. "Learn more about AI and understand my tech lead"
 * is two, and they are held apart for their whole life: each carries its own
 * verdict, its own question, its own answers and its own stated depth. The app
 * passes this array back on every turn — a build is one session, so it lives in
 * the conversation and not in a table.
 */
export interface RequestChunk {
  id: string;
  /** The user's own words for this request. Never our vocabulary. */
  text: string;
  verdict: 'too-broad' | 'too-vague' | 'unservable' | 'ready';
  /** What to ask. Null once the request is `ready` — or `unservable`. */
  question: string | null;
  /**
   * Why there is nothing to ask. Set on `unservable`: we understood exactly,
   * and we do not teach it, so no answer would help.
   */
  reason?: string;
  answers: string[];
  statedLevel: 'beginner' | 'intermediate' | 'advanced' | null;
  scope: string[];
  measured: {
    matchedWords: number;
    matchedTopics: number;
    topTrack: number | null;
    trackCoverage: number;
  };
}

/**
 * What one turn of the question loop returned.
 *
 * `plan` is null while any request is still open — however good the others
 * are. Nothing is built until every request has closed.
 */
/**
 * One word of the user's own, as the understanding cloud shows it — Rule 10.
 *
 * `request` is what they asked for, `detail` how they qualified it, `context`
 * who they are. Context is greyed rather than hidden: a user seeing their
 * industry come out large is how they catch it being mistaken for their ask.
 */
export interface CloudTerm {
  text: string;
  kind: 'request' | 'detail' | 'context';
  /** 0–1, relative to the largest term. Size, not importance. */
  weight: number;
  /** Negated — shown struck through, never removed. */
  struck: boolean;
  /** `RequestChunk.id` it came from. */
  request: string;
}

export interface BuiltPlan {
  /**
   * Which engine built this — ticket 068. `local-fallback` means Claude was
   * selected and the call failed, so the plan is worse than it should be and
   * the record says so rather than hiding it.
   */
  engine?: 'local' | 'claude' | 'local-fallback';
  /** Rule 5 — what we do not teach. Empty when there is nothing to say. */
  notCovered?: string;
  shouldAsk: boolean
  /**
   * The loop gave up asking and built with what it had, rather than building
   * because everything resolved. Rule 6 — say so on the review screen.
   */
  stoppedAtFloor?: boolean;
  isFoundation: boolean
  /** The requests, to be passed back on the next turn. */
  chunks: RequestChunk[];
  /** One question per still-open request, in the user's own words. */
  questions: string[];
  /** What we understood, in their words. Shown between asking and answering. */
  cloud?: CloudTerm[];
  sessionId?: string | null;
  /** What this path is for — the first need. Null when the build had none. */
  description: string | null;
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
  sessionId?: string | null;
  intent: string;
  intentConfidence: number;
  action: 'refine' | 'accept' | 'restart' | 'reject' | 'replace' | 'unhandled';
  /** Set when a removal named none of the user's requests — nothing was removed. */
  question?: string | null;
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
  description: string | null;
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
  /** The server records the turn; the client only carries the session id back. */
  async buildPlan(
    statement: string, maxClosureHops?: number | null, sessionId?: string | null,
  ): Promise<BuiltPlan> {
    const { data } = await api.post<BuiltPlan>('/track-builder/plan', {
      statement,
      maxClosureHops: maxClosureHops ?? null,
      sessionId: sessionId ?? null,
    });
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
    const { data } = await api.post<RefinedPlan>('/track-builder/refine', {
      statement, plan, sessionId: sessionId ?? null, chunks,
    });
    return data;
  },

  async createPlan(input: {
    name: string;
    description?: string | null;
    planJson: { topics: TrackPlanTopic[] };
    inputJson: { turns: TrackBuilderTurn[]; maxClosureHops?: number | null };
    /**
     * Which engine built it — 068 Chunk 4. Carried from the build rather than
     * read from config at save time, which would lie the moment anyone
     * flipped the toggle between building and accepting.
     */
    classifierEngine?: 'local' | 'claude' | 'local-fallback' | null;
  }): Promise<TrackPlan> {
    const { data } = await api.post<TrackPlan>('/track-plans', input);
    return data;
  },

  async getPlans(): Promise<TrackPlan[]> {
    const { data } = await api.get<TrackPlan[]>('/track-plans');
    return data;
  },

  /** Archive (soft-delete) a plan. `PUT /track-plans/:id` — not PATCH; validated
   *  by `updatePlanSchema` which already accepts `status`. */
  async updateTrackPlan(id: string, patch: { status: 'archived' }): Promise<TrackPlan> {
    const { data } = await api.put<TrackPlan>(`/track-plans/${id}`, patch);
    return data;
  },
};
