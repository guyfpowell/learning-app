import { QueryClient } from '@tanstack/react-query';
import { QUERY_CLIENT_DEFAULTS, QUERY_STALE_MS } from '@/lib/offlineWrites';
import { createTestQueryClient } from '@/test-utils/queryClient';

/**
 * A client with the app's own defaults (`QUERY_CLIENT_DEFAULTS`): loads and safe writes pause
 * offline and retry what never got an answer. For tests of that behaviour; every other test uses
 * `createTestQueryClient()`, which never pauses. No retry delay and no GC timer, so a test neither
 * waits nor leaves a timer running.
 */
export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { ...QUERY_CLIENT_DEFAULTS.queries, retryDelay: 0, gcTime: Infinity },
      mutations: { ...QUERY_CLIENT_DEFAULTS.mutations, retryDelay: 0, gcTime: Infinity },
    },
  });
}

/** `createTestQueryClient()` with the app's `staleTime`, for tests of what a fresh cache entry saves (a preload or prefetch). */
export function createStaleTimeTestQueryClient(): QueryClient {
  const client = createTestQueryClient();
  client.setDefaultOptions({ queries: { ...client.getDefaultOptions().queries, staleTime: QUERY_STALE_MS } });
  return client;
}
