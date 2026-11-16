import { onlineManager, type QueryClient } from '@tanstack/react-query';
import * as Sentry from '@sentry/react-native';
import { persistQueryClientSave } from '@tanstack/react-query-persist-client';
import type { ActivePathRef } from '@learning/shared';
import { dehydrateOptionsFor, writePersister } from '@/lib/offlineWrites';
import { SAFE_WRITES, SET_ACTIVE_PATH_WRITE, registerSafeWrites, startRegisteredWrite } from '@/lib/safeWrites';

/**
 * Leaves one "make active" write paused on `client` (the phone goes offline first) and saves it to
 * device storage, as the app would. The write never settles unless the test brings the phone back
 * online and resumes it.
 */
export async function pauseSetActiveWrite(client: QueryClient, ref: ActivePathRef): Promise<void> {
  registerSafeWrites(client);
  onlineManager.setOnline(false);
  startRegisteredWrite(client, SET_ACTIVE_PATH_WRITE, ref).catch((err: unknown) => {
    Sentry.addBreadcrumb({ category: 'test', message: 'Paused write rejected', data: { err: String(err) } });
  });
  await saveToDevice(client);
}

/** Saves `client` the way `PersistQueryClientProvider` does on every cache change. */
export function saveToDevice(client: QueryClient): Promise<void> {
  return persistQueryClientSave({
    queryClient: client,
    persister: writePersister,
    dehydrateOptions: dehydrateOptionsFor(client, SAFE_WRITES),
  });
}
