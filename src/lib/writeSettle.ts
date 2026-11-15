import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { DiscardedWriteError } from '@/lib/offlineWrites';

/**
 * One action that uses `useOptimisticMutation` (ADR-019). Its request and settle step live in
 * `optimisticWrites.ts`, not in its hook, so a write restored from device storage after a restart
 * runs the same steps.
 */
export interface OptimisticWrite {
  mutationKey: readonly unknown[];
  scope: string;
  /** The cache entry the write changes; saved to the device with a paused write. */
  queryKey: QueryKey;
  /** Takes `unknown` because a restored write's variables come from device storage. */
  mutationFn: (variables: unknown) => Promise<unknown>;
  /** Brings the screen back in line with the server. */
  settle: (client: QueryClient) => Promise<void>;
}

/** True when another write in the scope is still held. The write being settled is itself still pending, hence more than one. */
export function isOtherWritePending(client: QueryClient, scope: string): boolean {
  return client.isMutating({ predicate: (mutation) => mutation.options.scope?.id === scope }) > 1;
}

/**
 * Runs the write's settle step, unless a later write on the same keys is still to come, or sign-out
 * discarded this one. Not awaited: the next queued request must not wait for a refetch.
 */
export function settleWhenLast(client: QueryClient, write: OptimisticWrite, error: unknown): void {
  if (error instanceof DiscardedWriteError || isOtherWritePending(client, write.scope)) return;
  void write.settle(client);
}
