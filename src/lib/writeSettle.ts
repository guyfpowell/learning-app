import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { DiscardedWriteError } from '@/lib/offlineWrites';

/** What a write's variables look like: the tap's input and the key the server replays on (ADR-021). */
export interface SafeWriteVariables<TInput> {
  input: TInput;
  idempotencyKey: string;
}

/** How a write ended, for its settle step. */
export interface WriteOutcome {
  data: unknown;
  error: unknown;
  variables: unknown;
}

/**
 * One write that uses the patchy-signal mechanism (ADR-019 Decision 6, ADR-021 Decisions 4 and 5).
 * Its request and settle step live in `safeWrites.ts`, not in its hook, so a write restored
 * from device storage after a restart runs the same steps.
 */
export interface SafeWrite<TData = unknown> {
  mutationKey: readonly unknown[];
  /** Orders writes to the same thing. Absent when it depends on what is written to (a lesson): the hook sets it. */
  scope?: string;
  /** The cache entry an optimistic write changes ahead of the server, saved beside a paused write. A write that waits for the server has none. */
  queryKey?: QueryKey;
  /** Takes `unknown` because a restored write's variables come from device storage. */
  mutationFn: (variables: unknown) => Promise<TData>;
  /** Brings the screen back in line with the server. Absent when the server's reply is all the screen needs. */
  settle?: (client: QueryClient, outcome: WriteOutcome) => Promise<void>;
}

/** An optimistic write names the cache entry it changes, and always has a scope (ADR-019 Decision 4). */
export type OptimisticWrite = SafeWrite & Required<Pick<SafeWrite, 'scope' | 'queryKey'>>;

/** TanStack's scope option for a write's scope id; none when the write has no scope. */
export function scopeOption(scope: string | undefined): { scope?: { id: string } } {
  return scope === undefined ? {} : { scope: { id: scope } };
}

/** True when another write in the scope is still held. The write being settled is itself still pending, hence more than one. */
export function isOtherWritePending(client: QueryClient, scope: string): boolean {
  return client.isMutating({ predicate: (mutation) => mutation.options.scope?.id === scope }) > 1;
}

/** The scope of the write these variables belong to: a restored write keeps the scope it was made with. */
function scopeOf(client: QueryClient, write: SafeWrite, variables: unknown): string | undefined {
  const mutation = client.getMutationCache().find({ mutationKey: write.mutationKey, predicate: (m) => m.state.variables === variables });
  return mutation?.options.scope?.id ?? write.scope;
}

/**
 * Runs the write's settle step, unless a later write on the same thing is still to come, or sign-out
 * discarded this one. Not awaited: the next queued request must not wait for a refetch.
 */
export function settleWhenLast(client: QueryClient, write: SafeWrite, outcome: WriteOutcome): void {
  if (outcome.error instanceof DiscardedWriteError || write.settle === undefined) return;
  const scope = scopeOf(client, write, outcome.variables);
  if (scope !== undefined && isOtherWritePending(client, scope)) return;
  void write.settle(client, outcome);
}
