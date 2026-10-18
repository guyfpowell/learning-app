import { renderHook, waitFor, act } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test-utils/queryClient';
import { useSubmitQuiz } from '../useQuiz';
import { quizService } from '@/services/quiz.service';
import type { Lesson, QuizResult } from '@learning/shared';

jest.mock('@/services/quiz.service', () => ({
  quizService: { submitQuiz: jest.fn() },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

const mockQuizService = quizService as jest.Mocked<typeof quizService>;

// The hook never reads `lesson`, so a partial one is enough.
const mockResult: QuizResult = {
  score: 100,
  correct: true,
  feedbacks: [],
  lesson: { id: 'lesson-1', title: 'Test' } as Lesson,
  coaching: null,
  streak: 0,
  milestone: null,
  nextLessonId: null,
  retakeAvailable: false,
  trackAverage: null,
  previousAverage: null,
  lessonFinalized: false,
  xpAwarded: null,
  topicEnd: null,
  achievementsUnlocked: null,
};

describe('useSubmitQuiz', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls quizService.submitQuiz with lessonId and answers', async () => {
    mockQuizService.submitQuiz.mockResolvedValueOnce(mockResult);
    const { result } = renderHook(() => useSubmitQuiz(), { wrapper: queryWrapper() });

    act(() => { result.current.mutate({ lessonId: 'lesson-1', answers: { 'q-1': 'A' } }); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockQuizService.submitQuiz).toHaveBeenCalledWith(
      'lesson-1',
      { 'q-1': 'A' },
      { isRetake: undefined, skipRetake: undefined }
    );
  });

  it('passes isRetake and skipRetake through to the service', async () => {
    mockQuizService.submitQuiz.mockResolvedValueOnce(mockResult);
    const { result } = renderHook(() => useSubmitQuiz(), { wrapper: queryWrapper() });

    act(() => { result.current.mutate({ lessonId: 'lesson-1', answers: { 'q-1': 'A' }, isRetake: true }); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockQuizService.submitQuiz).toHaveBeenCalledWith(
      'lesson-1',
      { 'q-1': 'A' },
      { isRetake: true, skipRetake: undefined }
    );
  });

  it('passes completionTime through to the service (079e)', async () => {
    mockQuizService.submitQuiz.mockResolvedValueOnce(mockResult);
    const { result } = renderHook(() => useSubmitQuiz(), { wrapper: queryWrapper() });

    act(() => { result.current.mutate({ lessonId: 'lesson-1', answers: { 'q-1': 'A' }, completionTime: 37 }); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockQuizService.submitQuiz).toHaveBeenCalledWith(
      'lesson-1', { 'q-1': 'A' }, expect.objectContaining({ completionTime: 37 })
    );
  });

  it('exposes result data on success', async () => {
    mockQuizService.submitQuiz.mockResolvedValueOnce(mockResult);
    const { result } = renderHook(() => useSubmitQuiz(), { wrapper: queryWrapper() });

    act(() => { result.current.mutate({ lessonId: 'lesson-1', answers: {} }); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.score).toBe(100);
  });

  it('exposes error state on failure', async () => {
    mockQuizService.submitQuiz.mockRejectedValueOnce(new Error('Fail'));
    const { result } = renderHook(() => useSubmitQuiz(), { wrapper: queryWrapper() });

    act(() => { result.current.mutate({ lessonId: 'lesson-1', answers: {} }); });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('invalidates enrollments, progress, and lesson caches when lessonFinalized is true', async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    mockQuizService.submitQuiz.mockResolvedValueOnce({ ...mockResult, lessonFinalized: true });
    const { result } = renderHook(() => useSubmitQuiz(), { wrapper: queryWrapper(queryClient) });

    act(() => { result.current.mutate({ lessonId: 'lesson-1', answers: { 'q-1': 'A' } }); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['enrollments'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['progress'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['lesson', 'lesson-1'] });
  });

  it('does NOT invalidate caches when lessonFinalized is false', async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    mockQuizService.submitQuiz.mockResolvedValueOnce({ ...mockResult, lessonFinalized: false });
    const { result } = renderHook(() => useSubmitQuiz(), { wrapper: queryWrapper(queryClient) });

    act(() => { result.current.mutate({ lessonId: 'lesson-1', answers: { 'q-1': 'A' } }); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
