import { renderHook, waitFor, act } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test-utils/queryClient';
import { useSubmitQuiz } from '../useQuiz';
import { quizService } from '@/services/quiz.service';
import type { QuizResult } from '@learning/shared';
import { makeLesson } from '@/test-utils/lessons';

jest.mock('@/services/quiz.service', () => ({
  quizService: { submitQuiz: jest.fn() },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

const mockQuizService = quizService as jest.Mocked<typeof quizService>;

const mockResult: QuizResult = {
  correct: true,
  feedbacks: [],
  lesson: makeLesson({ id: 'lesson-1', title: 'Test' }),
  streak: 0,
  milestone: null,
  nextLessonId: null,
  retakeAvailable: false,
  trackAccuracy: 88,
  previousTrackAccuracy: 80,
  lessonFinalized: false,
  topicEnd: null,
  rewards: null,
};

describe('useSubmitQuiz', () => {
  beforeEach(() => { jest.clearAllMocks(); mockQuizService.submitQuiz.mockReset(); });

  it('calls quizService.submitQuiz with lessonId and answers', async () => {
    mockQuizService.submitQuiz.mockResolvedValue(mockResult);
    const { result } = renderHook(() => useSubmitQuiz('lesson-1'), { wrapper: queryWrapper() });

    act(() => { result.current.mutate({ lessonId: 'lesson-1', answers: { 'q-1': 'A' } }); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockQuizService.submitQuiz).toHaveBeenCalledWith(
      'lesson-1',
      { 'q-1': 'A' },
      { isRetake: undefined, skipRetake: undefined, completionTime: undefined },
      expect.stringMatching(/^[0-9a-f-]{36}$/),
    );
  });

  it('passes isRetake and skipRetake through to the service', async () => {
    mockQuizService.submitQuiz.mockResolvedValue(mockResult);
    const { result } = renderHook(() => useSubmitQuiz('lesson-1'), { wrapper: queryWrapper() });

    act(() => { result.current.mutate({ lessonId: 'lesson-1', answers: { 'q-1': 'A' }, isRetake: true }); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockQuizService.submitQuiz).toHaveBeenCalledWith(
      'lesson-1',
      { 'q-1': 'A' },
      { isRetake: true, skipRetake: undefined, completionTime: undefined },
      expect.stringMatching(/^[0-9a-f-]{36}$/),
    );
  });

  it('passes completionTime through to the service (079e)', async () => {
    mockQuizService.submitQuiz.mockResolvedValue(mockResult);
    const { result } = renderHook(() => useSubmitQuiz('lesson-1'), { wrapper: queryWrapper() });

    act(() => { result.current.mutate({ lessonId: 'lesson-1', answers: { 'q-1': 'A' }, completionTime: 37 }); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockQuizService.submitQuiz).toHaveBeenCalledWith(
      'lesson-1', { 'q-1': 'A' }, expect.objectContaining({ completionTime: 37 }), expect.stringMatching(/^[0-9a-f-]{36}$/),
    );
  });

  it('exposes result data on success', async () => {
    mockQuizService.submitQuiz.mockResolvedValue(mockResult);
    const { result } = renderHook(() => useSubmitQuiz('lesson-1'), { wrapper: queryWrapper() });

    act(() => { result.current.mutate({ lessonId: 'lesson-1', answers: {} }); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.trackAccuracy).toBe(mockResult.trackAccuracy);
  });

  it('exposes error state on failure', async () => {
    mockQuizService.submitQuiz.mockRejectedValue(new Error('Fail'));
    const { result } = renderHook(() => useSubmitQuiz('lesson-1'), { wrapper: queryWrapper() });

    act(() => { result.current.mutate({ lessonId: 'lesson-1', answers: {} }); });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('invalidates enrollments, progress, and lesson caches when lessonFinalized is true', async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    mockQuizService.submitQuiz.mockResolvedValue({ ...mockResult, lessonFinalized: true });
    const { result } = renderHook(() => useSubmitQuiz('lesson-1'), { wrapper: queryWrapper(queryClient) });

    act(() => { result.current.mutate({ lessonId: 'lesson-1', answers: { 'q-1': 'A' } }); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['enrollments'] }));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['progress'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['lesson', 'lesson-1'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['track-contents'] });
  });

  it('does NOT invalidate caches when lessonFinalized is false', async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    mockQuizService.submitQuiz.mockResolvedValue({ ...mockResult, lessonFinalized: false });
    const { result } = renderHook(() => useSubmitQuiz('lesson-1'), { wrapper: queryWrapper(queryClient) });

    act(() => { result.current.mutate({ lessonId: 'lesson-1', answers: { 'q-1': 'A' } }); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
