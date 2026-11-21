import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BREADCRUMB_CATEGORY, loggedLoad } from '@/lib/breadcrumbs';
import { quizOutcomesQueryKey } from '@/lib/queryKeys';
import { quizService } from '@/services/quiz.service';

/**
 * Every way the quiz can end (ADR-027), fetched fresh each time the quiz opens (`open` becomes true)
 * and thrown away when it closes: never kept from an earlier open, so nothing needs to refresh it.
 * A failed fetch is logged and leaves `data` empty, and the finished view then waits for the reply.
 */
export function useQuizOutcomes(lessonId: string, open: boolean) {
  const queryClient = useQueryClient();
  const queryKey = quizOutcomesQueryKey(lessonId);

  useEffect(() => {
    if (!open) return;
    return () => queryClient.removeQueries({ queryKey: quizOutcomesQueryKey(lessonId) });
  }, [queryClient, lessonId, open]);

  return useQuery({
    queryKey,
    queryFn: () => loggedLoad(BREADCRUMB_CATEGORY.lesson, 'Quiz outcomes load failed', () => quizService.getOutcomes(lessonId), { lessonId }),
    enabled: open,
    staleTime: 0,
    gcTime: 0,
  });
}
