import { QueryClient } from '@tanstack/react-query';
import { QUERY_CLIENT_DEFAULTS } from '@/lib/offlineWrites';

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
