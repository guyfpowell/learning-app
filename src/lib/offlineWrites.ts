import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { onlineManager, type DefaultOptions, type DehydrateOptions, type QueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import * as Sentry from '@sentry/react-native';
import { DAY_MS } from '@learning/shared';

/**
 * Patchy-signal support for the optimistic writes (ADR-019, Decision 6): offline detection, the
 * retry rule, what is saved to the device, and the one sign-out wipe. Nothing here applies to a
 * query or mutation that is not an optimistic write.
 */

/**
 * The app client's defaults: nothing but an optimistic write pauses offline or retries a mutation
 * (ADR-019, Decision 7). An optimistic write opts in itself (`OPTIMISTIC_WRITE_OPTIONS`).
 */
export const QUERY_CLIENT_DEFAULTS = {
  queries: { retry: 1, staleTime: 30_000, networkMode: 'always' },
  mutations: { retry: false, networkMode: 'always' },
} as const satisfies DefaultOptions;

/** Retries after the first attempt, with TanStack's growing delay. */
export const WRITE_RETRIES = 3;

/** A saved write older than this is dropped when the app starts. */
export const PERSIST_MAX_AGE_MS = DAY_MS;

/** The device-storage key the paused writes and their queries are saved under. */
export const PERSIST_STORAGE_KEY = 'ascent-offline-writes';

/** Feeds the phone's connection state to TanStack Query, which on React Native has no events of its own. */
export function connectOnlineManager(): void {
  onlineManager.setEventListener((setOnline) =>
    // `null` means NetInfo does not know yet, which is not offline.
    NetInfo.addEventListener((state) => setOnline(state.isConnected !== false && state.isInternetReachable !== false)),
  );
}

/** A network error, a timeout or a 5xx. A 4xx is a refusal: sending it again gets the same answer. */
export function isRetryableWriteError(error: unknown): boolean {
  if (!isAxiosError(error)) return false;
  return !error.response || error.response.status >= 500;
}

/** Thrown for a write that sign-out discarded, so it is never sent under the next person's session. */
export class DiscardedWriteError extends Error {
  constructor() {
    super('This write was discarded when the person signed out.');
  }
}

// Keyed by the variables object, which a retry and a restored write both pass to the mutation
// function unchanged.
const discardedWrites = new WeakSet<object>();

/** Throws if sign-out discarded the write these variables belong to. */
export function assertWriteNotDiscarded(variables: unknown): void {
  if (typeof variables === 'object' && variables !== null && discardedWrites.has(variables)) throw new DiscardedWriteError();
}

/** Options every optimistic write carries; every other mutation keeps the client defaults. */
export const OPTIMISTIC_WRITE_OPTIONS = {
  networkMode: 'online',
  retry: (failureCount: number, error: unknown) => failureCount < WRITE_RETRIES && isRetryableWriteError(error),
} as const;

/** Whether a serialised saved client holds a write; one without writes is not worth keeping. */
function holdsWrites(raw: string): boolean {
  const saved: unknown = JSON.parse(raw);
  if (typeof saved !== 'object' || saved === null || !('clientState' in saved)) return false;
  const { clientState } = saved;
  return typeof clientState === 'object' && clientState !== null && 'mutations' in clientState
    && Array.isArray(clientState.mutations) && clientState.mutations.length > 0;
}

// Storage holds something only while a write is paused, so after the last one settles, or after
// sign-out, the key is removed rather than left holding an empty client.
const writeStorage = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
  setItem: (key: string, value: string) => (holdsWrites(value) ? AsyncStorage.setItem(key, value) : AsyncStorage.removeItem(key)),
};

export const writePersister = createAsyncStoragePersister({ storage: writeStorage, key: PERSIST_STORAGE_KEY });

/**
 * What is saved: paused writes of the given keys, and the queries they write to. Queries are saved
 * only while a write is paused, so a restart with nothing waiting restores nothing.
 */
export function dehydrateOptionsFor(
  client: QueryClient,
  writes: ReadonlyArray<{ mutationKey: readonly unknown[]; queryKey: readonly unknown[] }>,
): DehydrateOptions {
  const isWriteKey = (key: readonly unknown[] | undefined) => writes.some((write) => key?.[0] === write.mutationKey[0]);
  const hasPausedWrite = () => client.getMutationCache().getAll().some((m) => m.state.isPaused && isWriteKey(m.options.mutationKey));
  return {
    shouldDehydrateMutation: (mutation) => mutation.state.isPaused && isWriteKey(mutation.options.mutationKey),
    shouldDehydrateQuery: (query) => hasPausedWrite() && writes.some((write) => query.queryKey[0] === write.queryKey[0]),
  };
}

/**
 * The one sign-out wipe (ADR-019, Decision 8), called by every sign-out path. Marks every write
 * still held as discarded, empties the cache, and removes what is saved on the device.
 */
export async function clearSessionData(client: QueryClient): Promise<void> {
  for (const mutation of client.getMutationCache().getAll()) {
    if (typeof mutation.state.variables === 'object' && mutation.state.variables !== null) discardedWrites.add(mutation.state.variables);
  }
  client.clear();
  try {
    await writePersister.removeClient();
  } catch (err) {
    Sentry.addBreadcrumb({ category: 'auth', message: 'Clearing saved writes failed', level: 'warning', data: { err: String(err) } });
  }
}
