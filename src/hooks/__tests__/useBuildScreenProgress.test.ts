import { renderHook, waitFor } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test-utils/queryClient';
import { makeBuiltPlan, makeDoneBuild } from '@/test-utils/trackBuilds';
import { BUILD_PHASE, type BuildProgress } from '@/lib/buildProgress';
import { UNSEEN_ACHIEVEMENTS_QUERY_KEY } from '@/lib/queryKeys';
import { useBuildScreenProgress } from '../useBuildScreenProgress';

let mockOpenedProgress: BuildProgress = { phase: BUILD_PHASE.building };

jest.mock('@/hooks/useTrackBuilder', () => ({
  useBuildPath: () => ({ progress: { phase: 'idle' }, buildId: null, start: jest.fn() }),
  useBuild: () => ({ progress: mockOpenedProgress, statement: 'I lead a team' }),
  useMarkBuildSeen: () => ({ mutate: jest.fn() }),
}));

describe('useBuildScreenProgress', () => {
  it('reads the unseen achievements when a finished build shows, and not before', async () => {
    const client = createTestQueryClient();
    client.setQueryData(UNSEEN_ACHIEVEMENTS_QUERY_KEY, { unseen: [] });

    mockOpenedProgress = { phase: BUILD_PHASE.building };
    const { rerender } = renderHook(() => useBuildScreenProgress('b1'), { wrapper: queryWrapper(client) });
    expect(client.getQueryState(UNSEEN_ACHIEVEMENTS_QUERY_KEY)?.isInvalidated).toBe(false);

    mockOpenedProgress = { phase: BUILD_PHASE.finished, build: makeDoneBuild('b1', 'I lead a team', makeBuiltPlan()) };
    rerender({});
    await waitFor(() => expect(client.getQueryState(UNSEEN_ACHIEVEMENTS_QUERY_KEY)?.isInvalidated).toBe(true));
  });
});
