import { lessonService } from '../lesson.service';

jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
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

  describe('saveLesson (ticket 017 chunk 3)', () => {
    it('calls POST /lessons/:id/save and returns the result', async () => {
      mockApi.post.mockResolvedValueOnce({ data: { saved: true } });
      const result = await lessonService.saveLesson('lesson-1');
      expect(mockApi.post).toHaveBeenCalledWith('/lessons/lesson-1/save');
      expect(result).toEqual({ saved: true });
    });
  });

  describe('unsaveLesson (ticket 017 chunk 3)', () => {
    it('calls DELETE /lessons/:id/save', async () => {
      mockApi.delete.mockResolvedValueOnce({});
      await lessonService.unsaveLesson('lesson-1');
      expect(mockApi.delete).toHaveBeenCalledWith('/lessons/lesson-1/save');
    });
  });

  describe('getSavedLessons (ticket 017 chunk 3)', () => {
    it('calls GET /lessons/saved and returns the list', async () => {
      const summaries = [{ id: 'lesson-1', title: 'Intro', topicName: null, skillName: 'PM', lessonNumber: 1, savedAt: '2026-07-04T00:00:00.000Z' }];
      mockApi.get.mockResolvedValueOnce({ data: summaries });
      const result = await lessonService.getSavedLessons();
      expect(mockApi.get).toHaveBeenCalledWith('/lessons/saved');
      expect(result).toEqual(summaries);
    });
  });
});
