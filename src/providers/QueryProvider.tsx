import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import * as Sentry from '@sentry/react-native';
import { type ReactNode } from 'react';
import { PERSIST_MAX_AGE_MS, QUERY_CLIENT_DEFAULTS, connectOnlineManager, dehydrateOptionsFor, writePersister } from '@/lib/offlineWrites';
import { OPTIMISTIC_WRITES, registerOptimisticWrites } from '@/lib/optimisticWrites';

interface QueryProviderProps {
  children: ReactNode;
}

// Module-level singleton — allows api.ts to clear the cache on auth clear.
export const queryClient = new QueryClient({ defaultOptions: QUERY_CLIENT_DEFAULTS });

connectOnlineManager();
// Before the saved writes are restored, so a restored write has its request and settle step.
registerOptimisticWrites(queryClient);

const persistOptions = {
  persister: writePersister,
  maxAge: PERSIST_MAX_AGE_MS,
  dehydrateOptions: dehydrateOptionsFor(queryClient, OPTIMISTIC_WRITES),
};

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
      onSuccess={() => { void queryClient.resumePausedMutations(); }}
      onError={() => {
        Sentry.addBreadcrumb({ category: 'offline', message: 'Restoring saved writes failed', level: 'warning' });
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
