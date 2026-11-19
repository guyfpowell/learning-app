import { act, renderHook, waitFor } from '@testing-library/react-native';
import { onlineManager } from '@tanstack/react-query';
import { axiosError } from '@/test-utils/axios';
import { createAppQueryClient } from '@/test-utils/appQueryClient';
import { makeCustomPath, makeEnrollment, makeTrackPath } from '@/test-utils/paths';
import { makeRewardUnlock, makeRewards } from '@/test-utils/achievements';
import { useCelebrationQueueStore } from '@/store/celebrationQueue.store';
import { SET_ACTIVE_PATH_ERROR, type UserPath } from '@learning/shared';
import { createTestQueryClient, queryWrapper } from '@/test-utils/queryClient';
import { must } from '@/test-utils/must';
import * as Sentry from '@sentry/react-native';
import { useEnroll, usePaths, useSetActivePath, useSkills, useSkip, useTopicFeedback } from '../useTrack';
import { NoSignalError } from '@/lib/offlineWrites';
import { trackService } from '@/services/track.service';

jest.mock('@/services/track.service', () => ({
  trackService: { getPaths: jest.fn(), getSkills: jest.fn(), setActivePath: jest.fn(), skip: jest.fn(), topicFeedback: jest.fn(), enroll: jest.fn() },
}));

const mockTrackService = trackService as jest.Mocked<typeof trackService>;

const track = makeTrackPath({ id: 's1' });
const plan = makeCustomPath({ id: 'p1' });

describe('usePaths', () => {
  it('logs a failed load and leaves it in the error state', async () => {
    mockTrackService.getPaths.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => usePaths(), { wrapper: queryWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({ message: 'Paths load failed' }));
  });
});

describe('useSkills', () => {
  it('logs a failed load and leaves it in the error state', async () => {
    mockTrackService.getSkills.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useSkills(), { wrapper: queryWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({ message: 'Skills load failed' }));
  });
});

describe('useSkip (079c)', () => {
  beforeEach(() => { jest.clearAllMocks(); mockTrackService.skip.mockReset(); });

  it('sends the path, the scope and the reason as one call', async () => {
    // Resolved by hand, so the test sees the call in flight and ends on a settled mutation rather
    // than returning while the skip is still running.
    const held: { resolve?: (path: UserPath) => void } = {};
    mockTrackService.skip.mockReturnValue(new Promise((resolve) => { held.resolve = resolve; }));
    const { result } = renderHook(() => useSkip(), { wrapper: queryWrapper() });

    act(() => result.current.skip(plan, 'topic', 'already_know'));

    await waitFor(() => expect(result.current.pendingScope(plan)).toBe('topic'));
    expect(mockTrackService.skip).toHaveBeenCalledWith({ kind: 'custom', id: 'p1', scope: 'topic', reason: 'already_know' });
    await act(async () => must(held.resolve, 'skip resolver')(track));
    await waitFor(() => expect(result.current.pendingScope(plan)).toBeNull());
  });

  it('reports the pending scope on the skipped path only', async () => {
    mockTrackService.skip.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useSkip(), { wrapper: queryWrapper() });

    act(() => result.current.skip(track, 'level', 'not_now'));

    await waitFor(() => expect(result.current.pendingScope(track)).toBe('level'));
    expect(result.current.pendingScope(plan)).toBeNull();
  });

  it('exposes the error of a failed skip', async () => {
    const failure = new Error('Feature not available');
    mockTrackService.skip.mockRejectedValue(failure);
    const { result } = renderHook(() => useSkip(), { wrapper: queryWrapper() });

    act(() => result.current.skip(track, 'lesson', 'not_for_me'));

    await waitFor(() => expect(result.current.error).toBe(failure));
    expect(result.current.pendingScope(track)).toBeNull();
  });
});

describe('useTopicFeedback (079d)', () => {
  it('submit writes the answer to the plan', async () => {
    mockTrackService.topicFeedback.mockResolvedValue(undefined);
    const { result } = renderHook(() => useTopicFeedback(), { wrapper: queryWrapper() });
    await act(async () => {
      await result.current.submit('p1', { stableKey: 'topic-a', dismissed: true });
      // TanStack Query tells the observer on a 0 ms timer after the promise settles; let it run
      // inside act, or the re-render lands after the test (the act warning, 079e refactor).
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(trackService.topicFeedback).toHaveBeenCalledWith('p1', { stableKey: 'topic-a', dismissed: true });
  });
});

describe('useSetActivePath (105)', () => {
  const trackA = makeTrackPath({ id: 's1', isActive: true });
  const planB = makeCustomPath({ id: 'p1', isActive: false });
  const refB = { kind: 'custom', id: 'p1' } as const;
  const activeIds = (paths: UserPath[] | undefined) => paths?.filter((p) => p.isActive).map((p) => p.id);

  /** The first load answers at once; a refetch after a switch is held open by hand until released. */
  function setup() {
    let switched = false;
    const held: {
      resolveSwitch?: () => void;
      rejectSwitch?: (err: Error) => void;
      resolveRefetch?: (paths: UserPath[]) => void;
    } = {};
    mockTrackService.getPaths.mockImplementation(() =>
      switched ? new Promise((resolve) => { held.resolveRefetch = resolve; }) : Promise.resolve([trackA, planB]));
    mockTrackService.setActivePath.mockImplementation(() => {
      switched = true;
      return new Promise<void>((resolve, reject) => { held.resolveSwitch = resolve; held.rejectSwitch = reject; });
    });
    const hook = renderHook(() => ({ paths: usePaths(), setActive: useSetActivePath() }), { wrapper: queryWrapper() });
    return {
      hook,
      resolveSwitch: () => must(held.resolveSwitch, 'switch resolver')(),
      rejectSwitch: (err: Error) => must(held.rejectSwitch, 'switch rejecter')(err),
      resolveRefetch: (paths: UserPath[]) => must(held.resolveRefetch, 'refetch resolver')(paths),
    };
  }

  beforeEach(() => { jest.clearAllMocks(); mockTrackService.getPaths.mockReset(); mockTrackService.setActivePath.mockReset(); });
  afterEach(async () => { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); }); });

  it('shows the tapped path active before the service resolves, and the previous one not active', async () => {
    const { hook } = setup();
    await waitFor(() => expect(hook.result.current.paths.isSuccess).toBe(true));

    act(() => hook.result.current.setActive.setActive(refB));

    await waitFor(() => expect(activeIds(hook.result.current.paths.data)).toEqual(['p1']));
    expect(mockTrackService.setActivePath).toHaveBeenCalledWith(refB);
  });

  it('puts the paths back, and returns the failure, when the service rejects', async () => {
    const { hook, rejectSwitch } = setup();
    await waitFor(() => expect(hook.result.current.paths.isSuccess).toBe(true));
    act(() => hook.result.current.setActive.setActive(refB));
    await waitFor(() => expect(activeIds(hook.result.current.paths.data)).toEqual(['p1']));

    await act(async () => { rejectSwitch(new Error('boom')); });

    await waitFor(() => expect(activeIds(hook.result.current.paths.data)).toEqual(['s1']));
    expect(hook.result.current.setActive.failure).toBe(SET_ACTIVE_PATH_ERROR);
  });

  it('keeps what is on screen while the refetch after a success is held open', async () => {
    const { hook, resolveSwitch, resolveRefetch } = setup();
    await waitFor(() => expect(hook.result.current.paths.isSuccess).toBe(true));
    act(() => hook.result.current.setActive.setActive(refB));
    await waitFor(() => expect(activeIds(hook.result.current.paths.data)).toEqual(['p1']));

    await act(async () => { resolveSwitch(); });
    await waitFor(() => expect(mockTrackService.getPaths).toHaveBeenCalledTimes(2));
    expect(activeIds(hook.result.current.paths.data)).toEqual(['p1']);

    await act(async () => { resolveRefetch([{ ...trackA, isActive: false }, { ...planB, isActive: true }]); });
    await waitFor(() => expect(activeIds(hook.result.current.paths.data)).toEqual(['p1']));
  });

  it('knows the tapped path is in flight until the server answers', async () => {
    const { hook, resolveSwitch } = setup();
    await waitFor(() => expect(hook.result.current.paths.isSuccess).toBe(true));

    act(() => hook.result.current.setActive.setActive(refB));

    expect(hook.result.current.setActive.isPendingFor(refB)).toBe(true);
    expect(hook.result.current.setActive.isPendingFor({ kind: 'track', id: 's1' })).toBe(false);
    await waitFor(() => expect(mockTrackService.setActivePath).toHaveBeenCalledTimes(1));
    await act(async () => { resolveSwitch(); });
    await waitFor(() => expect(hook.result.current.setActive.isPendingFor(refB)).toBe(false));
  });
});

describe('useSetActivePath on patchy signal (105a)', () => {
  const trackA = makeTrackPath({ id: 's1', isActive: true });
  const planB = makeCustomPath({ id: 'p1', isActive: false });
  const refA = { kind: 'track', id: 's1' } as const;
  const refB = { kind: 'custom', id: 'p1' } as const;
  const activeIds = (paths: UserPath[] | undefined) => paths?.filter((p) => p.isActive).map((p) => p.id);

  const networkError = axiosError('ERR_NETWORK');
  const timeout = axiosError('ECONNABORTED');
  const refusal = (status: number) => axiosError('ERR_BAD_RESPONSE', status);

  /** The service fails with `failWith` while `failing.on` is set; a failure can switch itself off after one. */
  const failing: { on: boolean; failWith: Error; once: boolean } = { on: false, failWith: networkError, once: false };
  function setup() {
    mockTrackService.getPaths.mockResolvedValue([trackA, planB]);
    mockTrackService.setActivePath.mockImplementation(() => {
      if (!failing.on) return Promise.resolve();
      if (failing.once) failing.on = false;
      return Promise.reject(failing.failWith);
    });
    return renderHook(() => ({ paths: usePaths(), setActive: useSetActivePath() }), { wrapper: queryWrapper() });
  }
  const advance = (ms: number) => act(async () => { await jest.advanceTimersByTimeAsync(ms); });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockTrackService.getPaths.mockReset();
    mockTrackService.setActivePath.mockReset();
    Object.assign(failing, { on: false, failWith: networkError, once: false });
  });
  afterEach(async () => {
    await advance(60_000);
    act(() => onlineManager.setOnline(true));
    jest.useRealTimers();
  });

  it('sends no request offline, shows the new state at once, and sends when signal returns', async () => {
    const hook = setup();
    await waitFor(() => expect(hook.result.current.paths.isSuccess).toBe(true));
    act(() => onlineManager.setOnline(false));

    act(() => hook.result.current.setActive.setActive(refB));

    await waitFor(() => expect(activeIds(hook.result.current.paths.data)).toEqual(['p1']));
    expect(mockTrackService.setActivePath).not.toHaveBeenCalled();
    expect(hook.result.current.setActive.failure).toBeNull();

    act(() => onlineManager.setOnline(true));
    await waitFor(() => expect(mockTrackService.setActivePath).toHaveBeenCalledWith(refB));
    await waitFor(() => expect(hook.result.current.setActive.isPendingFor(refB)).toBe(false));
  });

  it('sends two writes made offline in the order they were tapped', async () => {
    const hook = setup();
    await waitFor(() => expect(hook.result.current.paths.isSuccess).toBe(true));
    act(() => onlineManager.setOnline(false));

    act(() => hook.result.current.setActive.setActive(refB));
    act(() => hook.result.current.setActive.setActive(refA));
    await waitFor(() => expect(activeIds(hook.result.current.paths.data)).toEqual(['s1']));
    expect(mockTrackService.setActivePath).not.toHaveBeenCalled();

    act(() => onlineManager.setOnline(true));
    await waitFor(() => expect(mockTrackService.setActivePath).toHaveBeenCalledTimes(2));
    expect(mockTrackService.setActivePath.mock.calls.map(([ref]) => ref)).toEqual([refB, refA]);
    await waitFor(() => expect(hook.result.current.setActive.isPendingFor(refA)).toBe(false));
  });

  it.each([['a network error', networkError], ['a timeout', timeout]])('retries %s once and shows no failure when the retry works', async (_name, error) => {
    Object.assign(failing, { on: true, failWith: error, once: true });
    const hook = setup();
    await waitFor(() => expect(hook.result.current.paths.isSuccess).toBe(true));

    act(() => hook.result.current.setActive.setActive(refB));
    await waitFor(() => expect(mockTrackService.setActivePath).toHaveBeenCalledTimes(1));
    expect(hook.result.current.setActive.failure).toBeNull();
    await advance(1_000);

    await waitFor(() => expect(mockTrackService.setActivePath).toHaveBeenCalledTimes(2));
    expect(hook.result.current.setActive.failure).toBeNull();
    expect(activeIds(hook.result.current.paths.data)).toEqual(['p1']);
  });

  it('retries a 5xx three times, then shows the failure and restores the paths', async () => {
    Object.assign(failing, { on: true, failWith: refusal(503) });
    const hook = setup();
    await waitFor(() => expect(hook.result.current.paths.isSuccess).toBe(true));

    act(() => hook.result.current.setActive.setActive(refB));
    await waitFor(() => expect(mockTrackService.setActivePath).toHaveBeenCalledTimes(1));
    await advance(1_000);
    await advance(2_000);
    expect(mockTrackService.setActivePath).toHaveBeenCalledTimes(3);
    expect(hook.result.current.setActive.failure).toBeNull();
    await advance(4_000);

    await waitFor(() => expect(hook.result.current.setActive.failure).toBe(SET_ACTIVE_PATH_ERROR));
    expect(mockTrackService.setActivePath).toHaveBeenCalledTimes(4);
    expect(activeIds(hook.result.current.paths.data)).toEqual(['s1']);
  });

  it('never retries a 404: the failure shows at once', async () => {
    Object.assign(failing, { on: true, failWith: refusal(404) });
    const hook = setup();
    await waitFor(() => expect(hook.result.current.paths.isSuccess).toBe(true));

    act(() => hook.result.current.setActive.setActive(refB));

    await waitFor(() => expect(hook.result.current.setActive.failure).toBe(SET_ACTIVE_PATH_ERROR));
    await advance(30_000);
    expect(mockTrackService.setActivePath).toHaveBeenCalledTimes(1);
  });
});

describe('every other mutation on patchy signal (105a, 105g)', () => {
  const networkError = axiosError('ERR_NETWORK');
  const advance = (ms: number) => act(async () => { await jest.advanceTimersByTimeAsync(ms); });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockTrackService.enroll.mockReset();
    mockTrackService.skip.mockReset();
    mockTrackService.topicFeedback.mockReset();
  });
  afterEach(async () => {
    await advance(60_000);
    act(() => onlineManager.setOnline(true));
    jest.useRealTimers();
  });

  it('with no signal, enrol sends nothing and fails at once with NoSignalError', async () => {
    act(() => onlineManager.setOnline(false));
    const { result } = renderHook(() => useEnroll(), { wrapper: queryWrapper(createAppQueryClient()) });

    act(() => result.current.mutate('skill-1'));

    await waitFor(() => expect(result.current.error).toBeInstanceOf(NoSignalError));
    await advance(30_000);
    expect(mockTrackService.enroll).not.toHaveBeenCalled();
  });

  it('with no signal, a skip sends nothing and fails at once with NoSignalError', async () => {
    act(() => onlineManager.setOnline(false));
    const { result } = renderHook(() => useSkip(), { wrapper: queryWrapper(createAppQueryClient()) });

    act(() => result.current.skip(makeTrackPath({ id: 's1' }), 'lesson', 'not_now'));

    await waitFor(() => expect(result.current.error).toBeInstanceOf(NoSignalError));
    await advance(30_000);
    expect(mockTrackService.skip).not.toHaveBeenCalled();
  });

  it('with no signal, the topic answer sends nothing and fails at once with NoSignalError', async () => {
    act(() => onlineManager.setOnline(false));
    const { result } = renderHook(() => useTopicFeedback(), { wrapper: queryWrapper(createAppQueryClient()) });

    await expect(result.current.submit('p1', { stableKey: 'k', dismissed: false })).rejects.toBeInstanceOf(NoSignalError);
    expect(mockTrackService.topicFeedback).not.toHaveBeenCalled();
  });

  it('a skip that loses signal in flight fails with the network error, once, and never retries', async () => {
    mockTrackService.skip.mockRejectedValue(networkError);
    const { result } = renderHook(() => useSkip(), { wrapper: queryWrapper(createAppQueryClient()) });

    act(() => result.current.skip(makeTrackPath({ id: 's1' }), 'lesson', 'not_now'));

    await waitFor(() => expect(result.current.error).toBe(networkError));
    await advance(30_000);
    expect(mockTrackService.skip).toHaveBeenCalledTimes(1);
  });

  it('online, enrol sends as it always did', async () => {
    mockTrackService.enroll.mockResolvedValue({ enrollment: makeEnrollment(), rewards: makeRewards() });
    const { result } = renderHook(() => useEnroll(), { wrapper: queryWrapper(createAppQueryClient()) });

    act(() => result.current.mutate('skill-1'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockTrackService.enroll).toHaveBeenCalledWith('skill-1');
  });

  it('enrol queues the rewards its response carries', async () => {
    useCelebrationQueueStore.getState().clear();
    const offTheMark = makeRewardUnlock('off-the-mark');
    mockTrackService.enroll.mockResolvedValue({ enrollment: makeEnrollment(), rewards: makeRewards({ unlocked: [offTheMark] }) });
    const { result } = renderHook(() => useEnroll(), { wrapper: queryWrapper(createAppQueryClient()) });

    act(() => result.current.mutate('skill-1'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useCelebrationQueueStore.getState().queue).toEqual([offTheMark]);
  });
});
