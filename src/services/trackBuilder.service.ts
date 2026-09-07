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

export interface ChunkTurn {
  sessionId?: string | null;
  chunks: RequestChunk[];
  questions: string[];
  /** What we understood, in their words. Shown between asking and answering. */
  cloud?: CloudTerm[];
  shouldAsk: boolean;
  plan: BuiltPlan | null;
  /** Set by /negate when the negation named nothing. */
  negationQuestion?: string | null;
}

export interface BuiltPlan {
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
  async answerChunk(
    chunks: RequestChunk[], chunkId: string, answer: string, sessionId?: string | null,
  ): Promise<ChunkTurn> {
    const { data } = await api.post<ChunkTurn>('/track-builder/answer', {
      chunks, chunkId, answer, sessionId: sessionId ?? null,
    });
    return data;
  },

  /** The only turn that removes a request. */
  async negateChunk(
    chunks: RequestChunk[], negated: string, sessionId?: string | null,
  ): Promise<ChunkTurn> {
    const { data } = await api.post<ChunkTurn>('/track-builder/negate', {
      chunks, negated, sessionId: sessionId ?? null,
    });
    return data;
  },

  /**
   * `chunks` are the requests the plan was built from, and they matter:
   * a removal is matched against the words the user used for each request, so
   * without them "take out the job stuff" names nothing and comes back as a
   * question instead of being acted on.
   */
  async refinePlan(
    statement: string, plan: BuiltPlanTopic[], sessionId?: string | null,
    chunks?: RequestChunk[],
  ): Promise<RefinedPlan> {
    const { data } = await api.post<RefinedPlan>('/track-builder/refine', {
      statement, plan, sessionId: sessionId ?? null, chunks: chunks ?? [],
    });
    return data;
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
