/** Marks the refresh call itself, so its own 401 goes back to the caller instead of starting another refresh. */
export const SKIP_REFRESH_HEADER = 'X-Skip-Refresh';

/** Marks non-critical background work (`BACKGROUND_REQUEST`). */
export const BACKGROUND_HEADER = 'X-Background';

/**
 * Marks a request as non-critical background work. It still refreshes on a 401, so it succeeds
 * whenever it can, but a refused refresh never signs the person out because of it: a caller's own
 * `.catch()` can't prevent that, because the interceptor runs first. A dead session is still
 * caught: the next foreground request signs out.
 *
 * Spread into any fire-and-forget call: `api.patch(url, body, BACKGROUND_REQUEST)`.
 */
export const BACKGROUND_REQUEST = { headers: { [BACKGROUND_HEADER]: 'true' } } as const;
