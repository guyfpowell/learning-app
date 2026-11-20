import type { QueryClient } from '@tanstack/react-query';
import { ACHIEVEMENTS_QUERY_KEY, PATHS_QUERY_KEY, SKILLS_QUERY_KEY, WEEK_QUERY_KEY } from '@/lib/queryKeys';

/**
 * Refetches everything a path change can affect, the achievements and the week included (an enrolment is a Trailhead step). Resolves once the refetches land, so a mutation
 * returning it stays pending until the screen shows the new state. A client is passed in, not a
 * hook, so a write restored after a restart can run it too.
 */
export async function invalidatePathQueries(client: QueryClient): Promise<void> {
  await Promise.all([
    client.invalidateQueries({ queryKey: PATHS_QUERY_KEY }),
    client.invalidateQueries({ queryKey: SKILLS_QUERY_KEY }),
    client.invalidateQueries({ queryKey: ACHIEVEMENTS_QUERY_KEY }),
    client.invalidateQueries({ queryKey: WEEK_QUERY_KEY }),
  ]);
}
