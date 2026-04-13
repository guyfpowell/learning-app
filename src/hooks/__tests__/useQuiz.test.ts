import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useSubmitQuiz } from '../useQuiz';
import { quizService } from '@/services/quiz.service';

jest.mock('@/services/quiz.service', () => ({
  quizService: { submitQuiz: jest.fn() },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

const mockQuizService = quizService as jest.Mocked<typeof quizService>;

const mockResult = {
  score: 100,
  feedbacks: [],
  lesson: { id: 'lesson-1', title: 'Test' },
};

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useSubmitQuiz', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls quizService.submitQuiz with lessonId and answers', async () => {
    mockQuizService.submitQuiz.mockResolvedValueOnce(mockResult as any);
    const { result } = renderHook(() => useSubmitQuiz(), { wrapper: makeWrapper() });

    act(() => { result.current.mutate({ lessonId: 'lesson-1', answers: { 'q-1': 'A' } }); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockQuizService.submitQuiz).toHaveBeenCalledWith('lesson-1', { 'q-1': 'A' });
  });

  it('exposes result data on success', async () => {
    mockQuizService.submitQuiz.mockResolvedValueOnce(mockResult as any);
    const { result } = renderHook(() => useSubmitQuiz(), { wrapper: makeWrapper() });

    act(() => { result.current.mutate({ lessonId: 'lesson-1', answers: {} }); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.score).toBe(100);
  });

  it('exposes error state on failure', async () => {
    mockQuizService.submitQuiz.mockRejectedValueOnce(new Error('Fail'));
    const { result } = renderHook(() => useSubmitQuiz(), { wrapper: makeWrapper() });

    act(() => { result.current.mutate({ lessonId: 'lesson-1', answers: {} }); });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
