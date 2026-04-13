import { progressService } from '../progress.service';

jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

import api from '@/lib/api';

const mockApi = api as jest.Mocked<typeof api>;

const mockStats = {
  totalLessonsCompleted: 5,
  currentStreak: 3,
  averageScore: 82,
  lastLessonDate: new Date('2026-04-13'),
};

describe('progressService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getProgress', () => {
    it('calls GET /users/progress', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockStats });
      await progressService.getProgress();
      expect(mockApi.get).toHaveBeenCalledWith('/users/progress');
    });

    it('returns progress stats on success', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockStats });
      const result = await progressService.getProgress();
      expect(result).toEqual(mockStats);
    });

    it('throws on network error', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('Network error'));
      await expect(progressService.getProgress()).rejects.toThrow('Network error');
    });
  });
});
