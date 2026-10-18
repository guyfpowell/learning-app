import { useMutation, useQueryClient } from '@tanstack/react-query';
import { quizService } from '@/services/quiz.service';
import type { SubmitQuizRequest } from '@learning/shared';
import { PATHS_QUERY_KEY, PROGRESS_QUERY_KEY, TRACK_CONTENTS_QUERY_KEY, lessonQueryKey } from '@/lib/queryKeys';

type SubmitQuizInput = SubmitQuizRequest & { lessonId: string };

export function useSubmitQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ lessonId, answers, isRetake, skipRetake, completionTime }: SubmitQuizInput) =>
      quizService.submitQuiz(lessonId, answers, { isRetake, skipRetake, completionTime }),
    onSuccess: (data, variables) => {
      if (data.lessonFinalized) {
        queryClient.invalidateQueries({ queryKey: PATHS_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: PROGRESS_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: lessonQueryKey(variables.lessonId) });
        // Refresh the tree on the track detail screen so progress marks update.
        queryClient.invalidateQueries({ queryKey: TRACK_CONTENTS_QUERY_KEY });
      }
    },
  });
}
