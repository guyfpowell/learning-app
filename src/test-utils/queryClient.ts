import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// `gcTime: Infinity` stops TanStack Query scheduling its 5-minute cache-GC timer when an
// observer unmounts. Left at the default, every query and mutation leaves a real timer
// running after its suite, and Jest reports "A worker process has failed to exit gracefully".
// `networkMode: 'always'` keeps a screen test from pausing when it sets the phone offline. The app's
// own defaults are `networkMode: 'online'` for loads (`QUERY_CLIENT_DEFAULTS`); a test of that
// behaviour builds a client from them (see `queryDefaults.test.ts`).
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, networkMode: 'always' },
      mutations: { retry: false, gcTime: Infinity, networkMode: 'always' },
    },
  });
}

export function queryWrapper(client: QueryClient = createTestQueryClient()) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}
