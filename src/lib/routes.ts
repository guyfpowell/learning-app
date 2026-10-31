import type { UserPathKind } from '@learning/shared';
import { trackViewQuery, type TrackView } from './trackView';

/** Screens more than one place navigates to. The paywall's route is `PAYWALL_ROUTE` in `subscriptions.ts`. */
export const HOME_ROUTE = '/(tabs)/lessons';
export const TRACKS_ROUTE = '/(tabs)/tracks';
export const BUILD_ROUTE = '/build';
export const BUILD_REVIEW_ROUTE = '/build-review';

/** One lesson's screen. */
export function lessonRoute(lessonId: string) {
  return `/lesson/${lessonId}` as const;
}

/** One path's detail screen; `kind` is `track` (curated) or `custom`. A `view` opens a level, topic or lesson inside it. */
export function trackRoute(kind: UserPathKind, id: string, view: TrackView = {}) {
  return `/track/${kind}/${id}${trackViewQuery(view)}` as const;
}
