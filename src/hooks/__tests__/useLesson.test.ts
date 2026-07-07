import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useSaveLesson, useUnsaveLesson, useSavedLessons } from '../useLesson';
import { lessonService } from '@/services/lesson.service';

jest.mock('@/services/lesson.service', () => ({
  lessonService: {
    saveLesson: jest.fn(),
    unsaveLesson: jest.fn(),
    getSavedLessons: jest.fn(),
  },
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

describe('useSaveLesson (ticket 017 chunk 3)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls lessonService.saveLesson with the lesson id', async () => {
    mockLessonService.saveLesson.mockResolvedValueOnce({ saved: true });
    const { result } = renderHook(() => useSaveLesson(), { wrapper: makeWrapper() });

    act(() => { result.current.mutate('lesson-1'); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockLessonService.saveLesson).toHaveBeenCalledWith('lesson-1');
  });
});

describe('useUnsaveLesson (ticket 017 chunk 3)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls lessonService.unsaveLesson with the lesson id', async () => {
    mockLessonService.unsaveLesson.mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useUnsaveLesson(), { wrapper: makeWrapper() });

    act(() => { result.current.mutate('lesson-1'); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockLessonService.unsaveLesson).toHaveBeenCalledWith('lesson-1');
  });
});

describe('useSavedLessons (ticket 017 chunk 3)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns saved lessons on success', async () => {
    const summaries = [{ id: 'lesson-1', title: 'Intro', topicName: null, skillName: 'PM', lessonNumber: 1, savedAt: '2026-07-04T00:00:00.000Z' }];
    mockLessonService.getSavedLessons.mockResolvedValueOnce(summaries);
    const { result } = renderHook(() => useSavedLessons(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(summaries);
  });
});
