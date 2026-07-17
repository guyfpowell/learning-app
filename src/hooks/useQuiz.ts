import { useMutation, useQueryClient } from '@tanstack/react-query';
import { quizService } from '@/services/quiz.service';

interface SubmitQuizInput {
  lessonId: string;
  answers: Record<string, string>;
  isRetake?: boolean;
  skipRetake?: boolean;
}

export function useSubmitQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ lessonId, answers, isRetake, skipRetake }: SubmitQuizInput) =>
      quizService.submitQuiz(lessonId, answers, { isRetake, skipRetake }),
    onSuccess: (data, variables) => {
      if (data.lessonFinalized) {
        queryClient.invalidateQueries({ queryKey: ['enrollments'] });
        queryClient.invalidateQueries({ queryKey: ['progress'] });
        queryClient.invalidateQueries({ queryKey: ['lesson', variables.lessonId] });
      }
    },
  });
}
