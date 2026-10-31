import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test-utils/queryClient';
import { useCreateTrackPlan, useUpdateTrackPlan } from '../useTrackBuilder';
import { CURRENT_USER_QUERY_KEY, PATHS_QUERY_KEY, TRACK_CONTENTS_QUERY_KEY, TRACK_PLANS_QUERY_KEY } from '@/lib/queryKeys';
import { trackBuilderService } from '@/services/trackBuilder.service';
import { ERROR_CODES } from '@learning/shared';

jest.mock('@/services/trackBuilder.service', () => ({
  trackBuilderService: { createPlan: jest.fn(), updateTrackPlan: jest.fn() },
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
    createPlan.mockResolvedValue({ id: 'p1' });
    const { result, invalidate } = setup();
    act(() => result.current.mutate(plan));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: CURRENT_USER_QUERY_KEY });
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
