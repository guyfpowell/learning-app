import type { Lesson } from '@learning/shared';

/**
 * A retake is in progress when the lesson is complete but the current pass has answers and isn't
 * finished (`resolvedQuizIds` is the current pass), or one was just started and has no answers yet.
 * A finished pass has every question resolved, so it reads as complete, not as a retake.
 */
export function isRetakeInProgress(lesson: Lesson, retakeStarted: boolean): boolean {
  if (!lesson.quizCompleted) return false;
  const resolved = lesson.resolvedQuizIds?.length ?? 0;
  if (resolved >= lesson.quizzes.length) return false;
  return resolved > 0 || retakeStarted;
}
