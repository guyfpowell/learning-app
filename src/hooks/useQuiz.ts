import { useMutation } from '@tanstack/react-query';
import { quizService } from '@/services/quiz.service';

interface SubmitQuizInput {
  lessonId: string;
  answers: Record<string, string>;
}

export function useSubmitQuiz() {
  return useMutation({
    mutationFn: ({ lessonId, answers }: SubmitQuizInput) =>
      quizService.submitQuiz(lessonId, answers),
  });
}
