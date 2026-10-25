import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test-utils/queryClient';
import { makeCustomPath } from '@/test-utils/paths';
import { useDecideProposal, useProposal } from '../useProposal';
import { proposalService } from '@/services/proposal.service';
import { ERROR_CODES } from '@learning/shared';
import { PATHS_QUERY_KEY, proposalQueryKey } from '@/lib/queryKeys';

jest.mock('@/services/proposal.service', () => ({
  proposalService: { getProposal: jest.fn(), decide: jest.fn() },
}));

const mockService = proposalService as jest.Mocked<typeof proposalService>;

describe('useProposal (079g7)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches the plan\'s proposal when enabled', async () => {
    mockService.getProposal.mockResolvedValue(null);
    const { result } = renderHook(() => useProposal('plan-1', true), { wrapper: queryWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockService.getProposal).toHaveBeenCalledWith('plan-1');
  });

  it('does not fetch when the path has no proposal', () => {
    renderHook(() => useProposal('plan-1', false), { wrapper: queryWrapper() });
    expect(mockService.getProposal).not.toHaveBeenCalled();
  });
});

describe('useDecideProposal (079g7)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('refetches the paths and that plan\'s proposal after a decision', async () => {
    mockService.decide.mockResolvedValue(makeCustomPath({ id: 'plan-1' }));
    const client = createTestQueryClient();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useDecideProposal('plan-1'), { wrapper: queryWrapper(client) });

    act(() => result.current.mutate({ proposalId: 'prop-1', stage: 'change', decision: 'accept' }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockService.decide).toHaveBeenCalledWith({ proposalId: 'prop-1', stage: 'change', decision: 'accept' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: PATHS_QUERY_KEY });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: proposalQueryKey('plan-1') });
  });

  it('refetches when the proposal has moved on (409), and not on another failure', async () => {
    const client = createTestQueryClient();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useDecideProposal('plan-1'), { wrapper: queryWrapper(client) });
    const call = { proposalId: 'prop-1', stage: 'change', decision: 'decline' } as const;

    mockService.decide.mockRejectedValue({ response: { data: { code: ERROR_CODES.PROPOSAL_UNAVAILABLE } } });
    act(() => result.current.mutate(call));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: proposalQueryKey('plan-1') });

    invalidate.mockClear();
    mockService.decide.mockRejectedValue({ response: { data: { code: 'SOMETHING_ELSE' } } });
    act(() => result.current.mutate(call));
    await waitFor(() => expect(mockService.decide).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidate).not.toHaveBeenCalled();
  });
});
