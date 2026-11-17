import type { Quiz, QuizFeedback, QuizResult } from '@learning/shared';
import { ATTEMPTS_TO_RESOLVE, FIRST_ATTEMPT, isAnswerCorrect, isAnswerResolved, toFeedback } from '@learning/shared';

/** The result view an answer shows: a premium user's worked out at Submit (115e), a free user's from the server's reply. */
export type AnswerView =
  | { kind: 'retry' }
  | { kind: 'feedback'; fb: QuizFeedback | undefined }
  | { kind: 'final'; correct: boolean };

/**
 * The view for one answer, worked out on the phone with the server's own rules. `retake` is a
 * Submit after "Try again". The finished view is for the answer that resolves the last unresolved
 * question: `resolvedIds` plus this question cover every quiz.
 */
export function answerViewOf({ quiz, quizzes, answer, retake, resolvedIds }: {
  quiz: Quiz;
  quizzes: readonly Quiz[];
  answer: string;
  retake: boolean;
  resolvedIds: ReadonlySet<string>;
}): AnswerView {
  const isCorrect = isAnswerCorrect(quiz, answer, false);
  const resolved = isAnswerResolved({ isCorrect, attempts: retake ? ATTEMPTS_TO_RESOLVE : FIRST_ATTEMPT });
  if (!resolved) return { kind: 'retry' };
  if (quizzes.every(q => q.id === quiz.id || resolvedIds.has(q.id))) return { kind: 'final', correct: isCorrect };
  return { kind: 'feedback', fb: toFeedback(quiz, { answer, isCorrect }, resolved) };
}

/** The view the server's reply gives (a free user's only source of views). */
export function replyViewOf(data: QuizResult | undefined, currentId: string | undefined): AnswerView | null {
  if (!data) return null;
  if (!data.correct && data.retakeAvailable) return { kind: 'retry' };
  if (!data.lessonFinalized) {
    const fb = data.feedbacks.find(f => f.quizId === currentId) ?? data.feedbacks[0];
    return { kind: 'feedback', fb };
  }
  return { kind: 'final', correct: data.correct };
}
