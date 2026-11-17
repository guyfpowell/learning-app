import type { MutationStatus } from '@tanstack/react-query';
import { isFinishedTrackBuild, type FinishedTrackBuild, type TrackBuild } from '@learning/shared';

/** Where the person's tap on "build" has got to (ticket 106). */
export const BUILD_PHASE = {
  idle: 'idle',
  /** Tapped with no signal: the start request is saved on the device and waits. */
  paused: 'paused',
  /** The start request is on its way. */
  sending: 'sending',
  /** The server has the build and is working; the app is asking for the outcome. */
  building: 'building',
  finished: 'finished',
  /** The start was refused, or the outcome could not be read. */
  error: 'error',
} as const;

export type BuildProgress =
  | { phase: typeof BUILD_PHASE.idle | typeof BUILD_PHASE.paused | typeof BUILD_PHASE.sending | typeof BUILD_PHASE.building }
  | { phase: typeof BUILD_PHASE.finished; build: FinishedTrackBuild }
  | { phase: typeof BUILD_PHASE.error; error: unknown };

/** The facts `buildProgressOf` reads: the start request, and the polled build. */
export interface BuildFacts {
  start: { status: MutationStatus; isPaused: boolean; error: unknown };
  /** The latest the app has of the build: the start's reply, then each poll. */
  build: TrackBuild | undefined;
  /** An error from reading the build that is not worth waiting out; null while polling carries on. */
  readError: unknown;
}

/** Phases in which the person is waiting for Albert, so the screen holds the words and shows the wait. */
export const WAITING_PHASES: readonly BuildProgress['phase'][] = [BUILD_PHASE.paused, BUILD_PHASE.sending, BUILD_PHASE.building];

export function buildProgressOf({ start, build, readError }: BuildFacts): BuildProgress {
  switch (start.status) {
    case 'idle': return { phase: BUILD_PHASE.idle };
    case 'error': return { phase: BUILD_PHASE.error, error: start.error };
    case 'pending': return { phase: start.isPaused ? BUILD_PHASE.paused : BUILD_PHASE.sending };
    case 'success':
      if (readError !== null) return { phase: BUILD_PHASE.error, error: readError };
      if (build === undefined) return { phase: BUILD_PHASE.sending };
      return isFinishedTrackBuild(build) ? { phase: BUILD_PHASE.finished, build } : { phase: BUILD_PHASE.building };
  }
}

/** The "start" of a build that was opened rather than started here: the server already has it, so only its outcome is read. */
export const OPENED_START: BuildFacts['start'] = { status: 'success', isPaused: false, error: null };
