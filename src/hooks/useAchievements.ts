import { useQuery } from '@tanstack/react-query';
import { achievementService } from '@/services/achievement.service';
import { BREADCRUMB_CATEGORY, loggedLoad } from '@/lib/breadcrumbs';
import { ACHIEVEMENTS_QUERY_KEY } from '@/lib/queryKeys';

/** The medal grid (`GET /achievements`). A failed load is logged here; the section shows `ACHIEVEMENTS_LOAD_ERROR` from the query's error state. */
export function useAchievements() {
  return useQuery({
    queryKey: ACHIEVEMENTS_QUERY_KEY,
    queryFn: () => loggedLoad(BREADCRUMB_CATEGORY.ui, 'Achievements load failed', () => achievementService.getAchievements()),
  });
}
