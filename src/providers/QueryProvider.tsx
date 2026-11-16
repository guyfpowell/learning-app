import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import * as Sentry from '@sentry/react-native';
import { type ReactNode } from 'react';
import { PERSIST_MAX_AGE_MS, connectFocusManager, connectOnlineManager, dehydrateOptionsFor, writePersister } from '@/lib/offlineWrites';
import { SAFE_WRITES, registerSafeWrites } from '@/lib/safeWrites';
import { queryClient } from '@/lib/queryClient';

interface QueryProviderProps {
  children: ReactNode;
}

export { queryClient };

connectOnlineManager();
connectFocusManager();
// Before the saved writes are restored, so a restored write has its request and settle step.
registerSafeWrites(queryClient);

const persistOptions = {
  persister: writePersister,
  maxAge: PERSIST_MAX_AGE_MS,
  dehydrateOptions: dehydrateOptionsFor(queryClient, SAFE_WRITES),
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
