/** Screens more than one place navigates to. The paywall's route is `PAYWALL_ROUTE` in `subscriptions.ts`. */
export const HOME_ROUTE = '/(tabs)/lessons';
export const TRACKS_ROUTE = '/(tabs)/tracks';
export const BUILD_ROUTE = '/build';
export const BUILD_REVIEW_ROUTE = '/build-review';

/** One lesson's screen. */
export function lessonRoute(lessonId: string) {
  return `/(tabs)/lesson/${lessonId}` as const;
}
