import { useQuery } from '@tanstack/react-query';
import { BREADCRUMB_CATEGORY, loggedLoad } from '@/lib/breadcrumbs';
import { WEEK_QUERY_KEY } from '@/lib/queryKeys';
import { weekService } from '@/services/week.service';

/** The week's summary (`GET /users/me/week`). A failed load is logged here; the screen shows `WEEK_LOAD_ERROR` from the query's error state. */
export function useWeek() {
  return useQuery({
    queryKey: WEEK_QUERY_KEY,
    queryFn: () => loggedLoad(BREADCRUMB_CATEGORY.ui, 'Week load failed', () => weekService.getWeek()),
  });
}
