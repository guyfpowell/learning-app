import { useQuery } from '@tanstack/react-query';
import { BREADCRUMB_CATEGORY, loggedLoad } from '@/lib/breadcrumbs';
import { trackBuilderService } from '@/services/trackBuilder.service';
import { UNSEEN_BUILDS_QUERY_KEY } from '@/lib/queryKeys';

// The words are personal: the breadcrumb carries the error, never the builds.
function loadUnseenBuilds() {
  return loggedLoad(BREADCRUMB_CATEGORY.albert, 'Unseen builds load failed', () => trackBuilderService.listUnseenBuilds());
}

/**
 * The finished builds the person has not been shown, read from the server (ADR-020: no list on the device).
 * It reads when it mounts (app start) and each time the app returns to the foreground, so a missed push still resolves.
 */
export function useUnseenBuilds() {
  return useQuery({
    queryKey: UNSEEN_BUILDS_QUERY_KEY,
    queryFn: loadUnseenBuilds,
    refetchOnWindowFocus: 'always',
  });
}

/**
 * Whether the Albert tab should show its dot for a finished build. A failed read shows no dot, even when an earlier
 * read found one: the Albert tab says the read failed, and the next foreground read tries again.
 */
export function useHasUnseenBuild(): boolean {
  const { data, isError } = useUnseenBuilds();
  return !isError && (data?.length ?? 0) > 0;
}
