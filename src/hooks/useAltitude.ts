import { useQuery } from '@tanstack/react-query';
import { BREADCRUMB_CATEGORY, loggedLoad } from '@/lib/breadcrumbs';
import { ALTITUDE_QUERY_KEY } from '@/lib/queryKeys';
import { altitudeService } from '@/services/altitude.service';

export function useAltitude() {
  return useQuery({
    queryKey: ALTITUDE_QUERY_KEY,
    queryFn: () => loggedLoad(BREADCRUMB_CATEGORY.ui, 'Altitude load failed', () => altitudeService.getAltitude()),
  });
}
