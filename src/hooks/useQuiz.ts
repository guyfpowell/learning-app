import { useMutation } from '@tanstack/react-query';
import { quizService } from '@/services/quiz.service';

interface SubmitQuizInput {
  lessonId: string;
  answers: Record<string, string>;
  isRetake?: boolean;
  skipRetake?: boolean;
}

export function useSubmitQuiz() {
  return useMutation({
    mutationFn: ({ lessonId, answers, isRetake, skipRetake }: SubmitQuizInput) =>
      quizService.submitQuiz(lessonId, answers, { isRetake, skipRetake }),
  });
}
