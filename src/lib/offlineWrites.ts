import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { focusManager, onlineManager, type DefaultOptions, type DehydrateOptions, type QueryClient, type QueryKey } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import * as Sentry from '@sentry/react-native';
import { DAY_MS, ERROR_CODES } from '@learning/shared';
import { HEALTH_URL } from '@/lib/apiUrl';
import { errorCode } from '@/lib/errorCode';

/**
 * Patchy-signal support (ADR-019 Decision 6, ADR-021): offline detection, the one retry rule for
 * loads and writes, the writes that fail at once instead, what is saved to the device, and the
 * one sign-out wipe.
 */

/** Retries after the first attempt, with TanStack's growing delay, for loads and safe writes. */
export const RETRIES = 3;

/** How long a load's data counts as fresh before a remount or refocus refetches it. */
export const QUERY_STALE_MS = 30_000;

/**
 * The app client's defaults (ADR-021 Decision 3). A load pauses offline, keeps what it has, and
 * retries only what never got an answer. A mutation keeps today's behaviour unless it opts in
 * (`SAFE_WRITE_OPTIONS`): pausing or retrying a write that isn't safe to repeat could double it.
 */
export const QUERY_CLIENT_DEFAULTS = {
  queries: { retry: retryWhileRetryable, staleTime: QUERY_STALE_MS, networkMode: 'online' },
  mutations: { retry: false, networkMode: 'always' },
} as const satisfies DefaultOptions;

/** A saved write older than this is dropped when the app starts. */
export const PERSIST_MAX_AGE_MS = DAY_MS;

/** The device-storage key the paused writes and their queries are saved under. */
export const PERSIST_STORAGE_KEY = 'ascent-offline-writes';

/**
 * Feeds the phone's connection state to TanStack Query, which on React Native has no events of its
 * own. Offline means no connection, **or** Ascent's server not reachable: NetInfo's reachability
 * check calls the API's own liveness route, so "reachable" means the server answers, not that a
 * third-party URL does (ADR-021 Decision 3).
 */
export function connectOnlineManager(): void {
  NetInfo.configure({
    reachabilityUrl: HEALTH_URL,
    reachabilityMethod: 'GET',
    reachabilityTest: (response) => Promise.resolve(response.status === 200),
  });
  onlineManager.setEventListener((setOnline) =>
    // `null` means NetInfo does not know yet, which is not offline.
    NetInfo.addEventListener((state) => setOnline(state.isConnected !== false && state.isInternetReachable !== false)),
  );
}

/** Tells TanStack Query when the app is in the foreground, so reopening it refetches stale queries (ADR-021 Decision 3). */
export function connectFocusManager(): void {
  focusManager.setEventListener((handleFocus) => {
    const subscription = AppState.addEventListener('change', (state) => handleFocus(state === 'active'));
    return () => subscription.remove();
  });
}

/** The request never got an answer: a network error or a timeout. */
export function didNotReachServer(error: unknown): boolean {
  return isAxiosError(error) && error.response === undefined;
}

/** The server answered that it failed. */
function isServerError(error: unknown): boolean {
  return isAxiosError(error) && error.response !== undefined && error.response.status >= 500;
}

/** The server is still handling the first send of this write (105e); the reply will be there soon. */
function isWriteInProgress(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 409 && errorCode(error) === ERROR_CODES.IDEMPOTENCY_IN_PROGRESS;
}

/**
 * A network error, a timeout, a 5xx, or a reply still being made. Any other 4xx is a refusal:
 * sending it again gets the same answer.
 */
export function isRetryableError(error: unknown): boolean {
  return didNotReachServer(error) || isServerError(error) || isWriteInProgress(error);
}

/** The one retry rule, for loads and for the writes that opt in (ADR-021). */
export function retryWhileRetryable(failureCount: number, error: unknown): boolean {
  return failureCount < RETRIES && isRetryableError(error);
}

/** Thrown for a write that sign-out discarded, so it is never sent under the next person's session. */
export class DiscardedWriteError extends Error {
  constructor() {
    super('This write was discarded when the person signed out.');
  }
}

/** Thrown for a write that isn't safe to send again when there is no signal: nothing was sent (ADR-021 Decision 6). */
export class NoSignalError extends Error {
  constructor() {
    super('There is no signal, so this was not sent.');
  }
}

/**
 * Runs `send` only with signal; with none, fails at once and sends nothing. For a write that is
 * never paused, retried or saved: enrol, skip, purchases and Albert's actions.
 */
export function requireSignal<T>(send: () => Promise<T>): Promise<T> {
  if (!onlineManager.isOnline()) return Promise.reject(new NoSignalError());
  return send();
}

/** It was the signal: no signal to begin with, a network error or a timeout. Not a 5xx, which is the server answering. */
export function isSignalDrop(error: unknown): boolean {
  return error instanceof NoSignalError || didNotReachServer(error);
}

// Keyed by the variables object, which a retry and a restored write both pass to the mutation
// function unchanged.
const discardedWrites = new WeakSet<object>();

/** Throws if sign-out discarded the write these variables belong to. */
export function assertWriteNotDiscarded(variables: unknown): void {
  if (typeof variables === 'object' && variables !== null && discardedWrites.has(variables)) throw new DiscardedWriteError();
}

/** Options every write that is safe to send again carries; every other mutation keeps the client defaults. */
export const SAFE_WRITE_OPTIONS = {
  networkMode: 'online',
  retry: retryWhileRetryable,
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
 * What is saved: paused writes of the given keys, and the queries an optimistic one among them
 * writes to. Queries are saved only while a write is paused, so a restart with nothing waiting
 * restores nothing.
 */
export function dehydrateOptionsFor(
  client: QueryClient,
  writes: ReadonlyArray<{ mutationKey: readonly unknown[]; queryKey?: QueryKey }>,
): DehydrateOptions {
  const isWriteKey = (key: readonly unknown[] | undefined) => writes.some((write) => key?.[0] === write.mutationKey[0]);
  const hasPausedWrite = () => client.getMutationCache().getAll().some((m) => m.state.isPaused && isWriteKey(m.options.mutationKey));
  return {
    shouldDehydrateMutation: (mutation) => mutation.state.isPaused && isWriteKey(mutation.options.mutationKey),
    shouldDehydrateQuery: (query) => hasPausedWrite() && writes.some((write) => write.queryKey !== undefined && query.queryKey[0] === write.queryKey[0]),
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
