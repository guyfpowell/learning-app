import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test-utils/queryClient';
import { must } from '@/test-utils/must';
import { onlineManager } from '@tanstack/react-query';
import { NoSignalError } from '@/lib/offlineWrites';
import { useBuild, useBuildPath, useCreateTrackPlan, useMarkBuildSeen, useRefinePlan, useUpdateTrackPlan } from '../useTrackBuilder';
import { CURRENT_USER_QUERY_KEY, PATHS_QUERY_KEY, TRACK_CONTENTS_QUERY_KEY, TRACK_PLANS_QUERY_KEY, UNSEEN_BUILDS_QUERY_KEY, trackBuildQueryKey } from '@/lib/queryKeys';
import { trackBuilderService } from '@/services/trackBuilder.service';
import { ERROR_CODES, TRACK_BUILD_POLL_MS, TRACK_BUILD_STATUS, type TrackBuild } from '@learning/shared';
import { BUILD_PHASE } from '@/lib/buildProgress';
import { axiosError } from '@/test-utils/axios';
import { makeTrackPlan } from '@/test-utils/paths';
import { makeRewardUnlock, makeRewards } from '@/test-utils/achievements';
import { useCelebrationQueueStore } from '@/store/celebrationQueue.store';
import { makeBuiltPlan, makeDoneBuild, makeFailedBuild, makeInFlightBuild, makeNeedsMoreBuild } from '@/test-utils/trackBuilds';

jest.mock('@/services/trackBuilder.service', () => ({
  trackBuilderService: { startBuild: jest.fn(), getBuild: jest.fn(), markBuildSeen: jest.fn(), refinePlan: jest.fn(), createPlan: jest.fn(), updateTrackPlan: jest.fn() },
}));

const createPlan = trackBuilderService.createPlan as jest.Mock;
const plan = { name: 'Path', planJson: { topics: [] }, inputJson: { turns: [] } };

describe('useCreateTrackPlan', () => {
  beforeEach(() => jest.clearAllMocks());

  function setup() {
    const client = createTestQueryClient();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useCreateTrackPlan(), { wrapper: queryWrapper(client) });
    return { result, invalidate };
  }

  it('refreshes the signed-in user after a save, which spends the Albert allowance (079a)', async () => {
    createPlan.mockResolvedValue({ plan: makeTrackPlan({ id: 'p1' }), rewards: makeRewards() });
    const { result, invalidate } = setup();
    act(() => result.current.mutate(plan));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: CURRENT_USER_QUERY_KEY });
  });

  it('queues the rewards the response carries and hands back the plan from its field', async () => {
    useCelebrationQueueStore.getState().clear();
    const firstChapter = makeRewardUnlock('first-chapter');
    createPlan.mockResolvedValue({ plan: makeTrackPlan({ id: 'p1' }), rewards: makeRewards({ unlocked: [firstChapter] }) });
    const { result } = setup();
    act(() => result.current.mutate(plan));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.plan.id).toBe('p1');
    expect(useCelebrationQueueStore.getState().queue).toEqual([firstChapter]);
  });

  it('refreshes the signed-in user after a refused save too: the cached allowance was stale', async () => {
    createPlan.mockRejectedValue({ response: { data: { code: ERROR_CODES.ALBERT_ALLOWANCE_USED } } });
    const { result, invalidate } = setup();
    act(() => result.current.mutate(plan));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: CURRENT_USER_QUERY_KEY });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: TRACK_PLANS_QUERY_KEY });
  });
});

describe('useUpdateTrackPlan', () => {
  beforeEach(() => jest.clearAllMocks());

  function setup() {
    const client = createTestQueryClient();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateTrackPlan(), { wrapper: queryWrapper(client) });
    return { result, invalidate };
  }

  it('refreshes the signed-in user when the trial-over 409 refuses an archive: the cached trial was stale (079i3)', async () => {
    (trackBuilderService.updateTrackPlan as jest.Mock).mockRejectedValue({ response: { data: { code: ERROR_CODES.FRESH_PATH_TRIAL_OVER } } });
    const { result, invalidate } = setup();
    act(() => result.current.mutate({ id: 'p1', status: 'archived' }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: CURRENT_USER_QUERY_KEY });
  });

  it('leaves the signed-in user alone on any other failure', async () => {
    (trackBuilderService.updateTrackPlan as jest.Mock).mockRejectedValue(new Error('boom'));
    const { result, invalidate } = setup();
    act(() => result.current.mutate({ id: 'p1', status: 'archived' }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: CURRENT_USER_QUERY_KEY });
  });

  it('renames a path and refreshes everywhere the name shows: plans, paths and the track screen', async () => {
    (trackBuilderService.updateTrackPlan as jest.Mock).mockResolvedValue({ id: 'p1', name: 'Director path' });
    const { result, invalidate } = setup();
    act(() => result.current.mutate({ id: 'p1', name: 'Director path' }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(trackBuilderService.updateTrackPlan).toHaveBeenCalledWith('p1', { name: 'Director path' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: TRACK_PLANS_QUERY_KEY });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: PATHS_QUERY_KEY });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: TRACK_CONTENTS_QUERY_KEY });
  });
});

describe('Albert\'s path actions with no signal (105g)', () => {
  const service = trackBuilderService as jest.Mocked<typeof trackBuilderService>;
  beforeEach(() => {
    jest.clearAllMocks();
    act(() => onlineManager.setOnline(false));
  });
  afterEach(() => act(() => onlineManager.setOnline(true)));

  it('refine sends nothing and fails at once with NoSignalError', async () => {
    const { result } = renderHook(() => useRefinePlan(), { wrapper: queryWrapper() });
    act(() => result.current.mutate({ statement: 'I lead a team', plan: [], sessionId: 's1', chunks: [] }));
    await waitFor(() => expect(result.current.error).toBeInstanceOf(NoSignalError));
    expect(service.refinePlan).not.toHaveBeenCalled();
  });

  it('save sends nothing and fails at once with NoSignalError', async () => {
    const { result } = renderHook(() => useCreateTrackPlan(), { wrapper: queryWrapper() });
    act(() => result.current.mutate(plan));
    await waitFor(() => expect(result.current.error).toBeInstanceOf(NoSignalError));
    expect(service.createPlan).not.toHaveBeenCalled();
  });

  it('archive and rename send nothing and fail at once with NoSignalError', async () => {
    const { result } = renderHook(() => useUpdateTrackPlan(), { wrapper: queryWrapper() });
    act(() => result.current.mutate({ id: 'p1', name: 'New name' }));
    await waitFor(() => expect(result.current.error).toBeInstanceOf(NoSignalError));
    expect(service.updateTrackPlan).not.toHaveBeenCalled();
  });
});

describe('useBuildPath', () => {
  const WORDS = 'I lead a team';
  const startBuild = jest.mocked(trackBuilderService.startBuild);
  const getBuild = jest.mocked(trackBuilderService.getBuild);
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

  /** The id the app made at the tap, read from the start request. */
  const idOf = (call: number) => must(startBuild.mock.calls[call], 'start call')[1];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
    act(() => onlineManager.setOnline(true));
  });

  /** The start reply carries the id the app sent; each poll answers with what the test last set with `answerWith`. */
  function serve(first: (id: string) => TrackBuild) {
    let outcome = first;
    startBuild.mockImplementation(async (statement, id) => makeInFlightBuild(id, statement));
    getBuild.mockImplementation(async (id) => outcome(id));
    return { answerWith: (next: (id: string) => TrackBuild) => { outcome = next; } };
  }

  const poll = () => act(async () => { await jest.advanceTimersByTimeAsync(TRACK_BUILD_POLL_MS); });

  function setup() {
    return renderHook(() => useBuildPath(), { wrapper: queryWrapper() });
  }

  it('starts a build with a new id, then polls queued, running, done and ends with the plan', async () => {
    const plan = makeBuiltPlan();
    const server = serve((id) => makeInFlightBuild(id, WORDS, TRACK_BUILD_STATUS.running));
    const { result } = setup();

    act(() => result.current.start(WORDS));
    await waitFor(() => expect(result.current.progress.phase).toBe(BUILD_PHASE.building));
    expect(startBuild).toHaveBeenCalledWith(WORDS, expect.stringMatching(UUID));

    await poll();
    expect(result.current.progress.phase).toBe(BUILD_PHASE.building);
    server.answerWith((id) => makeDoneBuild(id, WORDS, plan));
    await poll();
    await poll();
    expect(result.current.progress).toEqual({ phase: BUILD_PHASE.finished, build: makeDoneBuild(idOf(0), WORDS, plan) });
    expect(getBuild).toHaveBeenCalledWith(idOf(0));
  });

  it('stops polling once the build is finished', async () => {
    serve((id) => makeDoneBuild(id, WORDS, makeBuiltPlan()));
    const { result } = setup();
    act(() => result.current.start(WORDS));
    await waitFor(() => expect(result.current.progress.phase).toBe(BUILD_PHASE.building));

    await poll();
    expect(result.current.progress.phase).toBe(BUILD_PHASE.finished);
    const polls = getBuild.mock.calls.length;
    await poll();
    await poll();
    expect(getBuild).toHaveBeenCalledTimes(polls);
  });

  it('ends with the "tell me more" message when the model needs more', async () => {
    serve((id) => makeNeedsMoreBuild(id, WORDS, 'Tell me more about your role'));
    const { result } = setup();
    act(() => result.current.start(WORDS));
    await waitFor(() => expect(result.current.progress.phase).toBe(BUILD_PHASE.building));
    await poll();
    expect(result.current.progress).toEqual({ phase: BUILD_PHASE.finished, build: makeNeedsMoreBuild(idOf(0), WORDS, 'Tell me more about your role') });
  });

  it('ends failed, and a retry is a new build id with the same words', async () => {
    serve((id) => makeFailedBuild(id, WORDS));
    const { result } = setup();
    act(() => result.current.start(WORDS));
    await waitFor(() => expect(result.current.progress.phase).toBe(BUILD_PHASE.building));
    await poll();
    expect(result.current.progress).toEqual({ phase: BUILD_PHASE.finished, build: makeFailedBuild(idOf(0), WORDS) });

    act(() => result.current.start(WORDS));
    await waitFor(() => expect(startBuild).toHaveBeenCalledTimes(2));
    expect(startBuild.mock.calls[1]?.[0]).toBe(WORDS);
    expect(idOf(1)).toMatch(UUID);
    expect(idOf(1)).not.toBe(idOf(0));
  });

  it('waits out a server error while polling, and still ends with the plan', async () => {
    const plan = makeBuiltPlan();
    const server = serve((id) => makeInFlightBuild(id, WORDS, TRACK_BUILD_STATUS.running));
    const { result } = setup();
    act(() => result.current.start(WORDS));
    await waitFor(() => expect(result.current.progress.phase).toBe(BUILD_PHASE.building));

    server.answerWith(() => { throw axiosError('ERR_BAD_RESPONSE', 503); });
    await poll();
    await poll();
    expect(result.current.progress.phase).toBe(BUILD_PHASE.building);

    server.answerWith((id) => makeDoneBuild(id, WORDS, plan));
    await poll();
    await poll();
    expect(result.current.progress).toEqual({ phase: BUILD_PHASE.finished, build: makeDoneBuild(idOf(0), WORDS, plan) });
  });

  it('stops polling and reports the error when reading the build is refused', async () => {
    const refused = axiosError('ERR_BAD_REQUEST', 404);
    const server = serve((id) => makeInFlightBuild(id, WORDS));
    const { result } = setup();
    act(() => result.current.start(WORDS));
    await waitFor(() => expect(result.current.progress.phase).toBe(BUILD_PHASE.building));

    server.answerWith(() => { throw refused; });
    await poll();
    await poll();
    expect(result.current.progress).toEqual({ phase: BUILD_PHASE.error, error: refused });
    const polls = getBuild.mock.calls.length;
    await poll();
    await poll();
    expect(getBuild).toHaveBeenCalledTimes(polls);
  });

  it('is idle until a build is started, and reports a refused start', async () => {
    startBuild.mockRejectedValue(new Error('refused'));
    const { result } = setup();
    expect(result.current.progress).toEqual({ phase: BUILD_PHASE.idle });

    act(() => result.current.start(WORDS));
    await waitFor(() => expect(result.current.progress.phase).toBe(BUILD_PHASE.error));
    expect(getBuild).not.toHaveBeenCalled();
  });

  it('offline, sends nothing and is paused; online, sends the same id and words', async () => {
    serve((id) => makeInFlightBuild(id, WORDS));
    act(() => onlineManager.setOnline(false));
    const { result } = setup();

    act(() => result.current.start(WORDS));
    await waitFor(() => expect(result.current.progress.phase).toBe(BUILD_PHASE.paused));
    expect(startBuild).not.toHaveBeenCalled();

    act(() => onlineManager.setOnline(true));
    await waitFor(() => expect(result.current.progress.phase).toBe(BUILD_PHASE.building));
    expect(startBuild).toHaveBeenCalledTimes(1);
    expect(startBuild).toHaveBeenCalledWith(WORDS, expect.stringMatching(UUID));
  });
});

describe('useBuild (ticket 108)', () => {
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => jest.useRealTimers());

  it('opens a build the server holds, with the words the server kept', async () => {
    const done = makeDoneBuild('b1', 'I lead a team', makeBuiltPlan());
    (trackBuilderService.getBuild as jest.Mock).mockResolvedValue(done);
    const { result } = renderHook(() => useBuild('b1'), { wrapper: queryWrapper() });
    await waitFor(() => expect(result.current.progress).toEqual({ phase: BUILD_PHASE.finished, build: done }));
    expect(result.current.statement).toBe('I lead a team');
  });

  it('waits out a server error on the first read, and still opens the build', async () => {
    jest.useFakeTimers();
    const done = makeDoneBuild('b1', 'I lead a team', makeBuiltPlan());
    let serverUp = false;
    (trackBuilderService.getBuild as jest.Mock).mockImplementation(async () => {
      if (!serverUp) throw axiosError('ERR_BAD_RESPONSE', 503);
      return done;
    });
    const { result } = renderHook(() => useBuild('b1'), { wrapper: queryWrapper() });
    await act(async () => { await jest.advanceTimersByTimeAsync(0); });
    expect(result.current.progress.phase).toBe(BUILD_PHASE.sending);

    serverUp = true;
    await act(async () => { await jest.advanceTimersByTimeAsync(TRACK_BUILD_POLL_MS); });
    await act(async () => { await jest.advanceTimersByTimeAsync(TRACK_BUILD_POLL_MS); });
    expect(result.current.progress).toEqual({ phase: BUILD_PHASE.finished, build: done });
  });

  it('is idle with no words when there is no build to open', () => {
    const { result } = renderHook(() => useBuild(undefined), { wrapper: queryWrapper() });
    expect(result.current).toEqual({ progress: { phase: BUILD_PHASE.idle }, statement: null });
    expect(trackBuilderService.getBuild).not.toHaveBeenCalled();
  });
});

describe('useMarkBuildSeen (ticket 108)', () => {
  beforeEach(() => jest.clearAllMocks());

  function setup() {
    const client = createTestQueryClient();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useMarkBuildSeen(), { wrapper: queryWrapper(client) });
    return { result, invalidate };
  }

  it('records the build as seen and refreshes the unseen list and that build', async () => {
    (trackBuilderService.markBuildSeen as jest.Mock).mockResolvedValue(undefined);
    const { result, invalidate } = setup();
    act(() => result.current.mutate('b1'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(trackBuilderService.markBuildSeen).toHaveBeenCalledWith('b1');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: UNSEEN_BUILDS_QUERY_KEY });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: trackBuildQueryKey('b1') });
  });

  it('refreshes the same queries when it fails, so the badge follows the server', async () => {
    (trackBuilderService.markBuildSeen as jest.Mock).mockRejectedValue(new Error('boom'));
    const { result, invalidate } = setup();
    act(() => result.current.mutate('b1'));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: UNSEEN_BUILDS_QUERY_KEY });
  });
});
