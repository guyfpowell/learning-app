import { useQuery } from '@tanstack/react-query';
import { progressService } from '@/services/progress.service';
import { PROGRESS_QUERY_KEY } from '@/lib/queryKeys';

export function useProgress() {
  return useQuery({
    queryKey: PROGRESS_QUERY_KEY,
    queryFn: () => progressService.getProgress(),
  });
}
