import { situationChangeService } from '../situationChange.service';

jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));

import api from '@/lib/api';

const mockApi = api as jest.Mocked<typeof api>;

describe('situationChangeService (079h)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('create POSTs { text } to the plan\'s situation-changes route and returns the stored change', async () => {
    const stored = { id: 'sc-1', planId: 'plan-1', text: 'New job', createdAt: '2026-10-26T10:00:00.000Z', outcome: 'running' };
    mockApi.post.mockResolvedValue({ data: stored });
    await expect(situationChangeService.create('plan-1', 'New job')).resolves.toEqual(stored);
    expect(mockApi.post).toHaveBeenCalledWith('/track-plans/plan-1/situation-changes', { text: 'New job' });
  });

  it('getLatest reads the plan\'s latest change and passes a null through', async () => {
    mockApi.get.mockResolvedValue({ data: null });
    await expect(situationChangeService.getLatest('plan-1')).resolves.toBeNull();
    expect(mockApi.get).toHaveBeenCalledWith('/track-plans/plan-1/situation-changes/latest');
  });
});
