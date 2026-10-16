import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test-utils/queryClient';
import { useCreateTrackPlan } from '../useTrackBuilder';
import { CURRENT_USER_QUERY_KEY } from '@/lib/queryKeys';
import { trackBuilderService } from '@/services/trackBuilder.service';
import { ERROR_CODES } from '@learning/shared';

jest.mock('@/services/trackBuilder.service', () => ({
  trackBuilderService: { createPlan: jest.fn() },
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
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ['track-plans'] });
  });
});
