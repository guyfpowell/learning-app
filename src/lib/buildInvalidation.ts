import type { QueryClient } from '@tanstack/react-query';
import { UNSEEN_BUILDS_QUERY_KEY, trackBuildQueryKey } from '@/lib/queryKeys';

/**
 * Refetches what a finished build changes: the unseen list (the Albert tab's badge and entry) and the build's own
 * outcome. A build is only saved as a path from the review, which refreshes the paths itself.
 */
export async function invalidateBuildQueries(client: QueryClient, buildId: string): Promise<void> {
  await Promise.all([
    client.invalidateQueries({ queryKey: UNSEEN_BUILDS_QUERY_KEY }),
    client.invalidateQueries({ queryKey: trackBuildQueryKey(buildId) }),
  ]);
}
