import { useMutation, useQueryClient } from '@tanstack/react-query';
import { quizService } from '@/services/quiz.service';
import type { SubmitQuizRequest } from '@learning/shared';

type SubmitQuizInput = SubmitQuizRequest & { lessonId: string };

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
        // Refresh the tree on the track detail screen so progress marks update.
        queryClient.invalidateQueries({ queryKey: ['track-contents'] });
      }
    },
  });
}
