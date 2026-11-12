import { QueryClient } from '@tanstack/react-query';
import { lessonQueryKey } from '@/lib/queryKeys';
import { PREVIEW_IN_PROGRESS_ID, PREVIEW_LESSON_ID, previewCompletedLesson, previewInProgressLesson, seedPreviewLesson } from '../previewLesson';

describe('previewCompletedLesson', () => {
  it('is a completed lesson with a takeaway, a position and quizzes, so the lesson screen looks it over', () => {
    const lesson = previewCompletedLesson();
    expect(lesson.quizCompleted).toBe(true);
    expect(lesson.lessonRetakeInProgress).toBe(false);
    expect(lesson.keyTakeaway).toBeTruthy();
    expect(lesson.lessonIndex).toBeLessThanOrEqual(lesson.totalLessons ?? 0);
    expect(lesson.quizzes.length).toBeGreaterThan(1);
  });
});

describe('seedPreviewLesson', () => {
  it('puts the lesson where the lesson screen reads it, and keeps it fresh', () => {
    const client = new QueryClient();
    seedPreviewLesson(client);
    expect(client.getQueryData(lessonQueryKey(PREVIEW_LESSON_ID))).toEqual(previewCompletedLesson());
    expect(client.getQueryDefaults(lessonQueryKey(PREVIEW_LESSON_ID)).staleTime).toBe(Infinity);
  });
});

describe('previewInProgressLesson', () => {
  it('is the same lesson, not yet completed, with no takeaway, and seeded beside the completed one', () => {
    const lesson = previewInProgressLesson();
    expect(lesson.quizCompleted).toBe(false);
    expect(lesson.keyTakeaway).toBeUndefined();
    expect(lesson.quizzes.map(q => q.lessonId)).toEqual(lesson.quizzes.map(() => PREVIEW_IN_PROGRESS_ID));
    const client = new QueryClient();
    seedPreviewLesson(client);
    expect(client.getQueryData(lessonQueryKey(PREVIEW_IN_PROGRESS_ID))).toEqual(lesson);
  });
});
