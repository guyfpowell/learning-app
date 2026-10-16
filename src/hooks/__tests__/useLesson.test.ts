import { renderHook, waitFor, act } from '@testing-library/react-native';
import { queryWrapper } from '@/test-utils/queryClient';
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

describe('useSaveLesson (ticket 017 chunk 3)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls lessonService.saveLesson with the lesson id', async () => {
    mockLessonService.saveLesson.mockResolvedValueOnce({ saved: true });
    const { result } = renderHook(() => useSaveLesson(), { wrapper: queryWrapper() });

    act(() => { result.current.mutate('lesson-1'); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockLessonService.saveLesson).toHaveBeenCalledWith('lesson-1');
  });
});

describe('useUnsaveLesson (ticket 017 chunk 3)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls lessonService.unsaveLesson with the lesson id', async () => {
    mockLessonService.unsaveLesson.mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useUnsaveLesson(), { wrapper: queryWrapper() });

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
    const { result } = renderHook(() => useSavedLessons(), { wrapper: queryWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(summaries);
  });
});
