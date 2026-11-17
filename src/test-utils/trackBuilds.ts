import {
  ERROR_CODES, TRACK_BUILD_STATUS, type BuiltPlan, type FinishedTrackBuild, type TrackBuild, type TrackBuildInFlightStatus,
} from '@learning/shared';

/** The fields every build has. */
function base(id: string, statement: string) {
  return { id, statement, createdAt: '2026-11-17T10:00:00.000Z', seen: false };
}

const FINISHED_AT = '2026-11-17T10:00:40.000Z';

/** A complete build in each state, so a test never casts a partial. */
export function makeInFlightBuild(id: string, statement: string, status: TrackBuildInFlightStatus = TRACK_BUILD_STATUS.queued): TrackBuild {
  return { ...base(id, statement), status };
}

export function makeDoneBuild(id: string, statement: string, plan: BuiltPlan): FinishedTrackBuild {
  return { ...base(id, statement), status: TRACK_BUILD_STATUS.done, finishedAt: FINISHED_AT, plan };
}

export function makeNeedsMoreBuild(id: string, statement: string, message: string): FinishedTrackBuild {
  return { ...base(id, statement), status: TRACK_BUILD_STATUS.needs_more, finishedAt: FINISHED_AT, message };
}

export function makeFailedBuild(id: string, statement: string): FinishedTrackBuild {
  return { ...base(id, statement), status: TRACK_BUILD_STATUS.failed, finishedAt: FINISHED_AT, errorCode: ERROR_CODES.TRACK_BUILDER_UNAVAILABLE };
}

/** A complete built plan with one topic. */
export function makeBuiltPlan(): BuiltPlan {
  return {
    description: 'understand what AI tools are',
    topics: [{ stableKey: 'topic-1', order: 0, topicName: 'Strategy basics', level: 'Beginner', reason: 'Career growth', area: 'Strategy', hops: 0 }],
    cloud: [],
    level: 'mid',
    levelConfidence: 1,
    intent: 'build',
    intentConfidence: 1,
    firedAreas: [],
    areas: {},
    shouldAsk: false,
    questions: [],
    chunks: [],
    engine: 'claude',
    stoppedAtFloor: false,
    sessionId: null,
  };
}
