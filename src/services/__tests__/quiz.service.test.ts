import { quizService } from '../quiz.service';

jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

import api from '@/lib/api';

const mockApi = api as jest.Mocked<typeof api>;

const mockResult = {
  score: 75,
  feedbacks: [
    {
      quizId: 'q-1',
      question: 'What is PM fit?',
      userAnswer: 'A',
      correctAnswer: 'A',
      isCorrect: true,
      explanation: 'Because...',
    },
  ],
  lesson: { id: 'lesson-1', title: 'Test Lesson' },
};

describe('quizService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('submitQuiz', () => {
    it('calls POST /lessons/:id/quiz with answers', async () => {
      mockApi.post.mockResolvedValueOnce({ data: mockResult });
      const answers = { 'q-1': 'A' };

      await quizService.submitQuiz('lesson-1', answers);

      expect(mockApi.post).toHaveBeenCalledWith('/lessons/lesson-1/quiz', { answers });
    });

    it('returns quiz result on success', async () => {
      mockApi.post.mockResolvedValueOnce({ data: mockResult });

      const result = await quizService.submitQuiz('lesson-1', { 'q-1': 'A' });

      expect(result).toEqual(mockResult);
    });

    it('throws on network error', async () => {
      mockApi.post.mockRejectedValueOnce(new Error('Network error'));

      await expect(quizService.submitQuiz('lesson-1', {})).rejects.toThrow('Network error');
    });
  });
});
