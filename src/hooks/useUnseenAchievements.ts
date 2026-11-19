import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BREADCRUMB_CATEGORY, loggedLoad } from '@/lib/breadcrumbs';
import { UNSEEN_ACHIEVEMENTS_QUERY_KEY } from '@/lib/queryKeys';
import { achievementService } from '@/services/achievement.service';
import { useAuthStore } from '@/store/auth.store';
import { useCelebrationQueueStore } from '@/store/celebrationQueue.store';

/**
 * Reads the unlocks the person has not been shown (ADR-022 Decision 7) and hands them to the celebration queue.
 * It reads when it mounts with a signed-in person (app start) and each time the app returns to the foreground;
 * a finished build shown invalidates the key. A failed read is logged, shows nothing and leaves the queue as it was.
 */
export function useUnseenAchievements(): void {
  const signedIn = useAuthStore((s) => s.accessToken !== null);
  const enqueue = useCelebrationQueueStore((s) => s.enqueue);
  const { data } = useQuery({
    queryKey: UNSEEN_ACHIEVEMENTS_QUERY_KEY,
    queryFn: () => loggedLoad(BREADCRUMB_CATEGORY.ui, 'Unseen achievements load failed', () => achievementService.getUnseen()),
    enabled: signedIn,
    refetchOnWindowFocus: 'always',
  });

  useEffect(() => {
    if (data) enqueue(data.unseen);
  }, [data, enqueue]);
}
