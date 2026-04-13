import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useTodayLesson } from '../useLesson';
import { lessonService } from '@/services/lesson.service';

jest.mock('@/services/lesson.service', () => ({
  lessonService: { getTodayLesson: jest.fn() },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

const mockLessonService = lessonService as jest.Mocked<typeof lessonService>;

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

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useTodayLesson', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns lesson data on success', async () => {
    mockLessonService.getTodayLesson.mockResolvedValueOnce(mockLesson);
    const { result } = renderHook(() => useTodayLesson(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockLesson);
  });

  it('is in loading state initially', async () => {
    mockLessonService.getTodayLesson.mockResolvedValueOnce(mockLesson);
    const { result } = renderHook(() => useTodayLesson(), { wrapper: makeWrapper() });
    expect(result.current.isLoading).toBe(true);
  });

  it('returns error state on failure', async () => {
    mockLessonService.getTodayLesson.mockRejectedValueOnce(new Error('API error'));
    const { result } = renderHook(() => useTodayLesson(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('calls lessonService.getTodayLesson once', async () => {
    mockLessonService.getTodayLesson.mockResolvedValueOnce(mockLesson);
    const { result } = renderHook(() => useTodayLesson(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockLessonService.getTodayLesson).toHaveBeenCalledTimes(1);
  });
});
