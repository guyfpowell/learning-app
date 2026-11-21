import { quizService } from '../quiz.service';
import { IDEMPOTENCY_KEY_HEADER } from '@learning/shared';

const KEY = '6f1c2b1e-9d5a-4c3b-8e7f-0a1b2c3d4e5f';
const keyed = { headers: { [IDEMPOTENCY_KEY_HEADER]: KEY } };

jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

import api from '@/lib/api';

const mockApi = api as jest.Mocked<typeof api>;

const mockResult = {
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
  lesson: { id: 'lesson-1', title: 'Test Lesson', retakeOffered: false },
};

describe('quizService', () => {
  beforeEach(() => jest.resetAllMocks());

  describe('submitQuiz', () => {
    it('sends completionTime when given (079e)', async () => {
      mockApi.post.mockResolvedValue({ data: mockResult });
      await quizService.submitQuiz('lesson-1', { 'q-1': 'A' }, { completionTime: 42 }, KEY);
      expect(mockApi.post).toHaveBeenCalledWith('/lessons/lesson-1/quiz', {
        answers: { 'q-1': 'A' }, isRetake: false, skipRetake: false, completionTime: 42,
      }, keyed);
    });

    it('calls POST /lessons/:id/quiz with answers', async () => {
      mockApi.post.mockResolvedValue({ data: mockResult });
      const answers = { 'q-1': 'A' };

      await quizService.submitQuiz('lesson-1', answers, undefined, KEY);

      expect(mockApi.post).toHaveBeenCalledWith('/lessons/lesson-1/quiz', {
        answers,
        isRetake: false,
        skipRetake: false,
      }, keyed);
    });

    it('sends isRetake and skipRetake flags when provided', async () => {
      mockApi.post.mockResolvedValue({ data: mockResult });

      await quizService.submitQuiz('lesson-1', { 'q-1': 'A' }, { isRetake: true }, KEY);

      expect(mockApi.post).toHaveBeenCalledWith('/lessons/lesson-1/quiz', {
        answers: { 'q-1': 'A' },
        isRetake: true,
        skipRetake: false,
      }, keyed);
    });

    it('returns quiz result on success', async () => {
      mockApi.post.mockResolvedValue({ data: mockResult });

      const result = await quizService.submitQuiz('lesson-1', { 'q-1': 'A' }, undefined, KEY);

      expect(result).toEqual(mockResult);
    });

    it('throws on network error', async () => {
      mockApi.post.mockRejectedValue(new Error('Network error'));

      await expect(quizService.submitQuiz('lesson-1', {}, undefined, KEY)).rejects.toThrow('Network error');
    });
  });
});
