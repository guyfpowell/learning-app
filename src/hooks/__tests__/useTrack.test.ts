import { act, renderHook, waitFor } from '@testing-library/react-native';
import { makeCustomPath, makeTrackPath } from '@/test-utils/paths';
import type { UserPath } from '@learning/shared';
import { queryWrapper } from '@/test-utils/queryClient';
import * as Sentry from '@sentry/react-native';
import { usePaths, useSkip, useTopicFeedback } from '../useTrack';
import { trackService } from '@/services/track.service';

jest.mock('@/services/track.service', () => ({
  trackService: { getPaths: jest.fn(), skip: jest.fn(), topicFeedback: jest.fn() },
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

describe('useSkip (079c)', () => {
  beforeEach(() => { jest.clearAllMocks(); mockTrackService.skip.mockReset(); });

  it('sends the path, the scope and the reason as one call', async () => {
    // Resolved by hand, so the test sees the call in flight and ends on a settled mutation rather
    // than returning while the skip is still running.
    let resolveSkip!: (path: UserPath) => void;
    mockTrackService.skip.mockReturnValue(new Promise((resolve) => { resolveSkip = resolve; }));
    const { result } = renderHook(() => useSkip(), { wrapper: queryWrapper() });

    act(() => result.current.skip(plan, 'topic', 'already_know'));

    await waitFor(() => expect(result.current.pendingScope(plan)).toBe('topic'));
    expect(mockTrackService.skip).toHaveBeenCalledWith({ kind: 'custom', id: 'p1', scope: 'topic', reason: 'already_know' });
    await act(async () => resolveSkip(track));
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
