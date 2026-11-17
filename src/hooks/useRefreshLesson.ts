import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Lesson } from '@learning/shared';
import { lessonQueryOptions } from '@/lib/lessonQuery';

/**
 * Asks the server for the lesson again (invalidates its one cache entry) and gives back what the
 * cache holds once that finishes: what the quiz resumes from when its last answer did not finish
 * the lesson. A failed refetch keeps the cache's last lesson, and the lesson screen shows its own
 * error state.
 */
export function useRefreshLesson(lessonId: string) {
  const queryClient = useQueryClient();
  return useCallback(async (): Promise<Lesson | undefined> => {
    const { queryKey } = lessonQueryOptions(lessonId);
    await queryClient.invalidateQueries({ queryKey });
    return queryClient.getQueryData(queryKey);
  }, [queryClient, lessonId]);
}
