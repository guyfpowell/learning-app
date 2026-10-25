import { proposalService } from '../proposal.service';

jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));

import api from '@/lib/api';

const mockApi = api as jest.Mocked<typeof api>;

describe('proposalService (079g7)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getProposal reads the plan\'s proposal and passes a null through', async () => {
    mockApi.get.mockResolvedValue({ data: null });
    await expect(proposalService.getProposal('plan-1')).resolves.toBeNull();
    expect(mockApi.get).toHaveBeenCalledWith('/track-plans/plan-1/proposal');
  });

  it.each([
    ['change', 'accept', '/proposals/prop-1/change'],
    ['move', 'decline', '/proposals/prop-1/move'],
  ] as const)('a %s decision POSTs { decision } to the proposal id\'s route', async (stage, decision, route) => {
    mockApi.post.mockResolvedValue({ data: { id: 'plan-1' } });
    await expect(proposalService.decide({ proposalId: 'prop-1', stage, decision })).resolves.toEqual({ id: 'plan-1' });
    expect(mockApi.post).toHaveBeenCalledWith(route, { decision });
  });
});
