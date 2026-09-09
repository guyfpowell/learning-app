import { useQuery } from '@tanstack/react-query';
import { achievementService } from '@/services/achievement.service';

export function useAchievements() {
  return useQuery({
    queryKey: ['achievements'],
    queryFn: () => achievementService.getAchievements(),
  });
}
