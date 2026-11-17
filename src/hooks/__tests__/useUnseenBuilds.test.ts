import { act, renderHook, waitFor } from '@testing-library/react-native';
import { focusManager } from '@tanstack/react-query';
import { createTestQueryClient, queryWrapper } from '@/test-utils/queryClient';
import { makeBuiltPlan, makeDoneBuild } from '@/test-utils/trackBuilds';
import { trackBuilderService } from '@/services/trackBuilder.service';
import { useHasUnseenBuild } from '../useUnseenBuilds';
import type { TrackBuild } from '@learning/shared';

jest.mock('@/services/trackBuilder.service', () => ({
  trackBuilderService: { listUnseenBuilds: jest.fn() },
}));

// What the server holds: the mock answers with this, so a test changes the server, not the call order.
let serverUnseen: TrackBuild[] = [];
let serverDown = false;

beforeEach(() => {
  serverUnseen = [];
  serverDown = false;
  (trackBuilderService.listUnseenBuilds as jest.Mock).mockImplementation(() =>
    serverDown ? Promise.reject(new Error('offline')) : Promise.resolve(serverUnseen));
});

describe('useHasUnseenBuild', () => {
  it('is false when the server has no unseen build', async () => {
    const { result } = renderHook(() => useHasUnseenBuild(), { wrapper: queryWrapper() });
    await waitFor(() => expect(trackBuilderService.listUnseenBuilds).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });

  it('is true on start when the server has a finished build the person has not seen', async () => {
    serverUnseen = [makeDoneBuild('b1', 'I lead a team', makeBuiltPlan())];
    const { result } = renderHook(() => useHasUnseenBuild(), { wrapper: queryWrapper() });
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('finds a build whose push was missed when the app returns to the foreground', async () => {
    const client = createTestQueryClient();
    const { result } = renderHook(() => useHasUnseenBuild(), { wrapper: queryWrapper(client) });
    await waitFor(() => expect(trackBuilderService.listUnseenBuilds).toHaveBeenCalled());
    expect(result.current).toBe(false);

    serverUnseen = [makeDoneBuild('b1', 'I lead a team', makeBuiltPlan())];
    act(() => { focusManager.setFocused(false); });
    act(() => { focusManager.setFocused(true); });
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('is false when the read fails: the next read tries again', async () => {
    serverDown = true;
    const { result } = renderHook(() => useHasUnseenBuild(), { wrapper: queryWrapper() });
    await waitFor(() => expect(trackBuilderService.listUnseenBuilds).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });

  it('is false when a later read fails, though an earlier one found a build', async () => {
    serverUnseen = [makeDoneBuild('b1', 'I lead a team', makeBuiltPlan())];
    const client = createTestQueryClient();
    const { result } = renderHook(() => useHasUnseenBuild(), { wrapper: queryWrapper(client) });
    await waitFor(() => expect(result.current).toBe(true));

    serverDown = true;
    act(() => { focusManager.setFocused(false); });
    act(() => { focusManager.setFocused(true); });
    await waitFor(() => expect(result.current).toBe(false));
  });
});
