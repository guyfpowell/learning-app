import type { QuizResult } from '@learning/shared';
import { SUBMIT_QUIZ_WRITE, type SubmitQuizInput } from '@/lib/safeWrites';
import { lessonWriteScope } from '@/lib/mutationKeys';
import { useSafeWrite } from '@/hooks/useSafeWrite';

export type { SubmitQuizInput } from '@/lib/safeWrites';

/**
 * One quiz answer. Safe to send again (ADR-021 Decision 4): it waits through a drop, keeps its
 * order behind the lesson's other writes, survives a restart, and the server replays a repeat, so
 * the answer that finishes the lesson never meets LESSON_ALREADY_COMPLETED on a retry. The screen
 * shows nothing ahead of the server: the submit button's loading state until the reply arrives.
 */
export function useSubmitQuiz(lessonId: string) {
  return useSafeWrite<SubmitQuizInput, QuizResult>(SUBMIT_QUIZ_WRITE, lessonWriteScope(lessonId));
}
