import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BREADCRUMB_CATEGORY, loggedLoad, warnBreadcrumb } from '@/lib/breadcrumbs';
import { trackBuilderService } from '@/services/trackBuilder.service';
import { errorCode } from '@/lib/errors';
import { isRetryableError, requireSignal } from '@/lib/offlineWrites';
import { invalidateBuildQueries } from '@/lib/buildInvalidation';
import { enqueueRewards } from '@/lib/rewards';
import { CURRENT_USER_QUERY_KEY, PATHS_QUERY_KEY, TRACK_CONTENTS_QUERY_KEY, TRACK_PLANS_QUERY_KEY, trackBuildQueryKey } from '@/lib/queryKeys';
import { START_TRACK_BUILD_WRITE, type StartTrackBuildInput } from '@/lib/safeWrites';
import { BUILD_PHASE, OPENED_START, buildProgressOf, type BuildProgress } from '@/lib/buildProgress';
import { useSafeWrite } from '@/hooks/useSafeWrite';
import {
  ERROR_CODES, TRACK_BUILD_POLL_MS, isFinishedTrackBuild,
  type CreateTrackPlanRequest, type TrackBuild, type RefinePlanRequest, type UpdateTrackPlanRequest,
} from '@learning/shared';

/**
 * Track builder hooks. Starting a build, refining and saving are mutations: they are user actions
 * with side effects on the server, never cached by statement. Only a started build's outcome is a
 * query, read by its id until it finishes.
 */

// The words are personal: the breadcrumb carries the error, never the build.
function loadBuild(buildId: string): Promise<TrackBuild> {
  return loggedLoad(BREADCRUMB_CATEGORY.albert, 'Path build load failed', () => trackBuilderService.getBuild(buildId));
}

/** A read error that ends the wait. A dropped signal or a server hiccup is waited out, so it gives null. */
function readErrorOf(error: unknown): unknown {
  return error !== null && !isRetryableError(error) ? error : null;
}

/**
 * Keeps asking until the build has finished, including before the first read has answered, unless
 * reading it failed in a way that is not worth waiting out. With no build id the query is off, so this never runs.
 */
function pollIntervalOf(build: TrackBuild | undefined, error: unknown): number | false {
  if (build !== undefined && isFinishedTrackBuild(build)) return false;
  return readErrorOf(error) === null ? TRACK_BUILD_POLL_MS : false;
}

/**
 * Builds a path in the background (ADR-020, ticket 106). `start` sends the words with a new build id
 * (paused and saved if there is no signal, ADR-021 Amendment 1), and the app then asks for the build
 * every `TRACK_BUILD_POLL_MS` until it has finished. No request is held open, so the global timeout stays.
 * A retry is a `start` again: a new build id with the same words.
 */
export function useBuildPath(): { progress: BuildProgress; buildId: string | null; start: (statement: string) => void } {
  const startWrite = useSafeWrite<StartTrackBuildInput, TrackBuild>(START_TRACK_BUILD_WRITE);
  const started = startWrite.data;
  const build = useQuery({
    queryKey: trackBuildQueryKey(started?.id),
    queryFn: started === undefined ? skipToken : () => loadBuild(started.id),
    initialData: started,
    refetchInterval: (query) => pollIntervalOf(query.state.data, query.state.error),
  });
  return {
    progress: buildProgressOf({ start: startWrite, build: build.data, readError: readErrorOf(build.error) }),
    buildId: started?.id ?? null,
    start: (statement) => {
      startWrite.reset();
      startWrite.mutate({ statement });
    },
  };
}

/**
 * One build the server holds, opened from a push or the Albert tab (ticket 108), as the build screen's progress.
 * Its words come from the server (`statement`), never from the device. Asks again while it is still going.
 */
export function useBuild(buildId: string | undefined): { progress: BuildProgress; statement: string | null } {
  const build = useQuery({
    queryKey: trackBuildQueryKey(buildId),
    queryFn: buildId === undefined ? skipToken : () => loadBuild(buildId),
    refetchInterval: (query) => pollIntervalOf(query.state.data, query.state.error),
  });
  if (buildId === undefined) return { progress: { phase: BUILD_PHASE.idle }, statement: null };
  return {
    progress: buildProgressOf({ start: OPENED_START, build: build.data, readError: readErrorOf(build.error) }),
    statement: build.data?.statement ?? null,
  };
}

/**
 * Records that a finished build has been shown, and refreshes the queries it affects so the badge clears.
 * Background housekeeping: a failure is logged and the next unseen read shows the build again.
 */
export function useMarkBuildSeen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (buildId: string) => requireSignal(() => trackBuilderService.markBuildSeen(buildId)),
    onError: (err) => {
      warnBreadcrumb(BREADCRUMB_CATEGORY.albert, 'Marking a build seen failed', err);
    },
    onSettled: (_data, _err, buildId) => invalidateBuildQueries(queryClient, buildId),
  });
}

/** Applies a follow-up to a plan. It runs on cue words ("take out", "drop", "keep"), which never need the model. */
export function useRefinePlan() {
  return useMutation({
    mutationFn: (v: RefinePlanRequest) =>
      requireSignal(() => trackBuilderService.refinePlan(v.statement, v.plan, v.sessionId, v.chunks)),
  });
}

export function useCreateTrackPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (v: CreateTrackPlanRequest) => requireSignal(() => trackBuilderService.createPlan(v)),
    onSuccess: ({ rewards }) => {
      enqueueRewards(rewards);
      // Custom plans take precedence on the home surface, so both caches move.
      void queryClient.invalidateQueries({ queryKey: TRACK_PLANS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: PATHS_QUERY_KEY });
    },
    // A save spends the free Albert allowance, and a refused one (ALBERT_ALLOWANCE_USED)
    // means the cached count was stale: either way /me's `albertAllowance` has moved (079a).
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
    },
  });
}

export function useTrackPlans() {
  return useQuery({
    queryKey: TRACK_PLANS_QUERY_KEY,
    queryFn: () => trackBuilderService.getPlans(),
  });
}

/** Archive or rename a custom plan via `PUT /track-plans/:id`. Invalidates the same plan
 *  and enrollment keys as `useCreateTrackPlan` so Paths, Home and Tracks all refresh, and
 *  the track screens, which show the name.
 *  Not /me on success: neither archiving nor renaming gives back the Albert allowance (079a). The trial-over 409
 *  (079i3) means the cached session was stale, so /me is read again and never retried. */
export function useUpdateTrackPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string } & (
      Required<Pick<UpdateTrackPlanRequest, 'status'>> | Required<Pick<UpdateTrackPlanRequest, 'name'>>
    )) => requireSignal(() => trackBuilderService.updateTrackPlan(id, patch)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TRACK_PLANS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: PATHS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: TRACK_CONTENTS_QUERY_KEY });
    },
    onError: err => {
      if (errorCode(err) === ERROR_CODES.FRESH_PATH_TRIAL_OVER) void queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
    },
  });
}

