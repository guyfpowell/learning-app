import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { UserPath } from '@learning/shared';
import { queryWrapper } from '@/test-utils/queryClient';
import { useSkip, useTopicFeedback } from '../useTrack';
import { trackService } from '@/services/track.service';

jest.mock('@/services/track.service', () => ({
  trackService: { skip: jest.fn() },
}));

const mockTrackService = trackService as jest.Mocked<typeof trackService>;

const track = { kind: 'track', id: 's1' } as UserPath;
const plan = { kind: 'custom', id: 'p1' } as UserPath;

describe('useSkip (079c)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends the path, the scope and the reason as one call', async () => {
    // Resolved by hand, so the test sees the call in flight and ends on a settled mutation rather
    // than returning while the skip is still running.
    let resolveSkip!: (path: UserPath) => void;
    mockTrackService.skip.mockReturnValueOnce(new Promise((resolve) => { resolveSkip = resolve; }));
    const { result } = renderHook(() => useSkip(), { wrapper: queryWrapper() });

    act(() => result.current.skip(plan, 'topic', 'already_know'));

    await waitFor(() => expect(result.current.pendingScope(plan)).toBe('topic'));
    expect(mockTrackService.skip).toHaveBeenCalledWith({ kind: 'custom', id: 'p1', scope: 'topic', reason: 'already_know' });
    await act(async () => resolveSkip(track));
    await waitFor(() => expect(result.current.pendingScope(plan)).toBeNull());
  });

  it('reports the pending scope on the skipped path only', async () => {
    mockTrackService.skip.mockReturnValueOnce(new Promise(() => {}));
    const { result } = renderHook(() => useSkip(), { wrapper: queryWrapper() });

    act(() => result.current.skip(track, 'level', 'not_now'));

    await waitFor(() => expect(result.current.pendingScope(track)).toBe('level'));
    expect(result.current.pendingScope(plan)).toBeNull();
  });

  it('exposes the error of a failed skip', async () => {
    const failure = new Error('Feature not available');
    mockTrackService.skip.mockRejectedValueOnce(failure);
    const { result } = renderHook(() => useSkip(), { wrapper: queryWrapper() });

    act(() => result.current.skip(track, 'lesson', 'not_for_me'));

    await waitFor(() => expect(result.current.error).toBe(failure));
    expect(result.current.pendingScope(track)).toBeNull();
  });
});

describe('useTopicFeedback (079d)', () => {
  it('submit writes the answer to the plan', async () => {
    (trackService as unknown as { topicFeedback: jest.Mock }).topicFeedback = jest.fn().mockResolvedValue(undefined);
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
