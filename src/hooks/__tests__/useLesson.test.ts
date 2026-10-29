import { renderHook, waitFor, act } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test-utils/queryClient';
import * as Sentry from '@sentry/react-native';
import { useLesson, useSaveLesson, useUnsaveLesson, useSavedLessons, useStartRetake, useSetLessonRating } from '../useLesson';
import { lessonQueryKey } from '@/lib/queryKeys';
import { lessonService } from '@/services/lesson.service';
import type { Lesson } from '@learning/shared';

jest.mock('@/services/lesson.service', () => ({
  lessonService: {
    saveLesson: jest.fn(),
    unsaveLesson: jest.fn(),
    getSavedLessons: jest.fn(),
    startRetake: jest.fn(),
    getLesson: jest.fn(),
    setRating: jest.fn(),
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

describe('useLesson', () => {
  it('logs a failed load and keeps the error for the screen', async () => {
    mockLessonService.getLesson.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useLesson('lesson-1'), { wrapper: queryWrapper(createTestQueryClient()) });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({
      category: 'lesson', message: 'Lesson load failed', data: expect.objectContaining({ lessonId: 'lesson-1' }),
    }));
  });
});

describe('useSaveLesson (ticket 017 chunk 3)', () => {
  beforeEach(() => { jest.clearAllMocks(); Object.values(mockLessonService).forEach((fn) => fn.mockReset()); });

  it('calls lessonService.saveLesson with the lesson id', async () => {
    mockLessonService.saveLesson.mockResolvedValue({ saved: true });
    const { result } = renderHook(() => useSaveLesson(), { wrapper: queryWrapper() });

    act(() => { result.current.mutate('lesson-1'); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockLessonService.saveLesson).toHaveBeenCalledWith('lesson-1');
  });
});

describe('useUnsaveLesson (ticket 017 chunk 3)', () => {
  beforeEach(() => { jest.clearAllMocks(); Object.values(mockLessonService).forEach((fn) => fn.mockReset()); });

  it('calls lessonService.unsaveLesson with the lesson id', async () => {
    mockLessonService.unsaveLesson.mockResolvedValue(undefined);
    const { result } = renderHook(() => useUnsaveLesson(), { wrapper: queryWrapper() });

    act(() => { result.current.mutate('lesson-1'); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockLessonService.unsaveLesson).toHaveBeenCalledWith('lesson-1');
  });
});

describe('useSavedLessons (ticket 017 chunk 3)', () => {
  beforeEach(() => { jest.clearAllMocks(); Object.values(mockLessonService).forEach((fn) => fn.mockReset()); });

  it('returns saved lessons on success', async () => {
    const summaries = [{ id: 'lesson-1', title: 'Intro', topicName: null, skillName: 'PM', lessonNumber: 1, savedAt: '2026-07-04T00:00:00.000Z' }];
    mockLessonService.getSavedLessons.mockResolvedValue(summaries);
    const { result } = renderHook(() => useSavedLessons(), { wrapper: queryWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(summaries);
  });
});

describe('useStartRetake (079e)', () => {
  beforeEach(() => { jest.clearAllMocks(); Object.values(mockLessonService).forEach((fn) => fn.mockReset()); });

  it('marks the cached lesson as a retake with nothing answered, then refetches it', async () => {
    const client = createTestQueryClient();
    client.setQueryData(lessonQueryKey('lesson-1'), { ...mockLesson, quizCompleted: true, resolvedQuizIds: ['q1'] });
    mockLessonService.startRetake.mockResolvedValue({ pass: 2 });
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useStartRetake(), { wrapper: queryWrapper(client) });

    act(() => { result.current.mutate('lesson-1'); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueryData(lessonQueryKey('lesson-1'))).toMatchObject({ lessonRetakeInProgress: true, resolvedQuizIds: [] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: lessonQueryKey('lesson-1') });
  });

  it('a failed start leaves the cached lesson as it was', async () => {
    const client = createTestQueryClient();
    const cached = { ...mockLesson, quizCompleted: true, resolvedQuizIds: ['q1'] };
    client.setQueryData(lessonQueryKey('lesson-1'), cached);
    mockLessonService.startRetake.mockRejectedValue(new Error('409'));
    const { result } = renderHook(() => useStartRetake(), { wrapper: queryWrapper(client) });

    act(() => { result.current.mutate('lesson-1'); });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(client.getQueryData(lessonQueryKey('lesson-1'))).toEqual(cached);
  });
});

describe('useSetLessonRating', () => {
  it('PUTs the rating and writes it into the cached lesson', async () => {
    mockLessonService.setRating.mockResolvedValue(undefined);
    const client = createTestQueryClient();
    client.setQueryData(lessonQueryKey('lesson-1'), { ...mockLesson, rating: null });
    const { result } = renderHook(() => useSetLessonRating(), { wrapper: queryWrapper(client) });
    act(() => { result.current.mutate({ lessonId: 'lesson-1', rating: 'down' }); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockLessonService.setRating).toHaveBeenCalledWith('lesson-1', 'down');
    expect(client.getQueryData<Lesson>(lessonQueryKey('lesson-1'))?.rating).toBe('down');
  });

  it('sends null to clear', async () => {
    mockLessonService.setRating.mockResolvedValue(undefined);
    const { result } = renderHook(() => useSetLessonRating(), { wrapper: queryWrapper(createTestQueryClient()) });
    act(() => { result.current.mutate({ lessonId: 'lesson-1', rating: null }); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockLessonService.setRating).toHaveBeenCalledWith('lesson-1', null);
  });
});
