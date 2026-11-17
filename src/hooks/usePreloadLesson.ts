import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useEmailVerification';
import { lessonQueryOptions } from '@/lib/lessonQuery';

/**
 * Loads a lesson into the cache before it is tapped, for a premium user only: opening a premium
 * lesson spends a free user's lifetime preview, so a preload for them could spend one on a lesson
 * never opened. Same key and fetch as `useLesson`, so the screen reads this data. A fresh cached
 * lesson isn't asked for again, a failure shows nothing (the screen's own load shows its error),
 * and nothing is saved to the device.
 */
export function usePreloadLesson(id: string | null | undefined) {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const isPremium = user?.isPremium === true;

  useEffect(() => {
    if (!id || !isPremium) return;
    void queryClient.prefetchQuery(lessonQueryOptions(id));
  }, [queryClient, id, isPremium]);
}
