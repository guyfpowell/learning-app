import { useQuery } from '@tanstack/react-query';
import { xpService } from '@/services/xp.service';

export function useXp() {
  return useQuery({
    queryKey: ['xp'],
    queryFn: () => xpService.getXp(),
  });
}
