import api from '@/lib/api';
import type { QuizResult } from '@learning/shared';

export const quizService = {
  async submitQuiz(
    lessonId: string,
    answers: Record<string, string>,
    options?: { isRetake?: boolean; skipRetake?: boolean }
  ): Promise<QuizResult> {
    const { data } = await api.post<QuizResult>(`/lessons/${lessonId}/quiz`, {
      answers,
      isRetake: options?.isRetake ?? false,
      skipRetake: options?.skipRetake ?? false,
    });
    return data;
  },
};
