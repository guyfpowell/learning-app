import { lessonService } from '../lesson.service';

jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

import api from '@/lib/api';

const mockApi = api as jest.Mocked<typeof api>;

const mockLesson = {
  id: 'lesson-1',
  skillPathId: 'sp-1',
  day: 1,
  title: 'Introduction to Product Management',
  content: '{"introduction":"Hello"}',
  durationMinutes: 5,
  difficulty: 'beginner' as const,
  quizzes: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('lessonService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getTodayLesson', () => {
    it('calls GET /lessons/today', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockLesson });
      await lessonService.getTodayLesson();
      expect(mockApi.get).toHaveBeenCalledWith('/lessons/today');
    });

    it('returns the lesson on success', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockLesson });
      const result = await lessonService.getTodayLesson();
      expect(result).toEqual(mockLesson);
    });

    it('throws on network error', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('Network error'));
      await expect(lessonService.getTodayLesson()).rejects.toThrow('Network error');
    });
  });
});
