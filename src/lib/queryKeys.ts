/**
 * The cache key for the signed-in user (`GET /auth/me`). Invalidate it when a write
 * changes what /me reports. Its own module, not the hook's: screen tests mock
 * `@/hooks/useEmailVerification` with a factory, which would make it undefined.
 */
export const CURRENT_USER_QUERY_KEY = ['auth', 'me'] as const;
