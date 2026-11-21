import api from '@/lib/api';
import type { QuizOutcomesResponse, QuizResult, SubmitQuizRequest } from '@learning/shared';
import { withIdempotencyKey } from '@/lib/idempotencyKey';

export const quizService = {
  async submitQuiz(
    lessonId: string,
    answers: SubmitQuizRequest['answers'],
    options: Omit<SubmitQuizRequest, 'answers'> | undefined,
    idempotencyKey: string,
  ): Promise<QuizResult> {
    const body: SubmitQuizRequest = {
      answers,
      isRetake: options?.isRetake ?? false,
      skipRetake: options?.skipRetake ?? false,
      ...(options?.completionTime !== undefined ? { completionTime: options.completionTime } : {}),
    };
    const { data } = await api.post<QuizResult>(`/lessons/${lessonId}/quiz`, body, withIdempotencyKey(idempotencyKey));
    return data;
  },

  /** Every way the quiz can end, worked out and not saved (ADR-027). */
  async getOutcomes(lessonId: string): Promise<QuizOutcomesResponse> {
    const { data } = await api.get<QuizOutcomesResponse>(`/lessons/${lessonId}/quiz-outcomes`);
    return data;
  },
};
