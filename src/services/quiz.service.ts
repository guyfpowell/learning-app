import api from '@/lib/api';
import type { QuizResult } from '@learning/shared';

export const quizService = {
  async submitQuiz(lessonId: string, answers: Record<string, string>): Promise<QuizResult> {
    const { data } = await api.post<QuizResult>(`/lessons/${lessonId}/quiz`, { answers });
    return data;
  },
};
