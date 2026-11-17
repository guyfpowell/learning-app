import { queryOptions } from '@tanstack/react-query';
import type { TrackContents, UserPathKind } from '@learning/shared';
import { trackService } from '@/services/track.service';
import { trackContentsQueryKey } from '@/lib/queryKeys';
import { BREADCRUMB_CATEGORY, loggedLoad } from '@/lib/breadcrumbs';

/** The contents fetch, logged on failure; the track screen shows the query's error state. */
function loadTrackContents(kind: UserPathKind, id: string): Promise<TrackContents> {
  return loggedLoad(BREADCRUMB_CATEGORY.paths, 'Track contents load failed', () => trackService.getTrackContents(kind, id), { kind, pathId: id });
}

/** The one key and fetch for a path's contents. `useTrackContents` and the next-screen prefetch both use it, so they share a cache entry. */
export function trackContentsQueryOptions(kind: UserPathKind, id: string) {
  return queryOptions({ queryKey: trackContentsQueryKey(kind, id), queryFn: () => loadTrackContents(kind, id) });
}
