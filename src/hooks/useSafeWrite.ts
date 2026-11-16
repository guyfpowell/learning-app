import { useMutation, useQueryClient, type MutateOptions, type UseMutationResult } from '@tanstack/react-query';
import { SAFE_WRITE_OPTIONS } from '@/lib/offlineWrites';
import { newIdempotencyKey } from '@/lib/idempotencyKey';
import { scopeOption, settleWhenLast, type SafeWrite, type SafeWriteVariables } from '@/lib/writeSettle';

type Options<TInput, TData> = MutateOptions<TData, Error, SafeWriteVariables<TInput>>;

/** TanStack's mutation result, with `mutate` taking the tap's input: the key is added here. */
export type SafeWriteMutation<TInput, TData> =
  Omit<UseMutationResult<TData, Error, SafeWriteVariables<TInput>>, 'mutate' | 'mutateAsync'> & {
    mutate: (input: TInput, options?: Options<TInput, TData>) => void;
    mutateAsync: (input: TInput, options?: Options<TInput, TData>) => Promise<TData>;
  };

/**
 * A write that is safe to send again (ADR-021 Decisions 4 and 5): it pauses offline, retries a
 * network error, a timeout, a 5xx or a reply still being made, and is saved across a restart.
 * The idempotency key is made here, at the tap, and held in the variables, so every retry and a
 * restored write send the same one. The screen reads the result as it reads any mutation; nothing
 * changes ahead of the server. `scope` orders writes to the same thing: a write whose scope depends
 * on what it writes to (a lesson) passes it, the rest carry it on their registry entry.
 */
export function useSafeWrite<TInput, TData>(
  write: SafeWrite<TData>,
  scope: string | undefined = write.scope,
): SafeWriteMutation<TInput, TData> {
  const queryClient = useQueryClient();
  const mutation = useMutation<TData, Error, SafeWriteVariables<TInput>>({
    ...SAFE_WRITE_OPTIONS,
    mutationKey: write.mutationKey,
    ...scopeOption(scope),
    mutationFn: write.mutationFn,
    onSettled: (data, error, variables) => settleWhenLast(queryClient, write, { data, error, variables }),
  });
  return {
    ...mutation,
    mutate: (input, options) => mutation.mutate({ input, idempotencyKey: newIdempotencyKey() }, options),
    mutateAsync: (input, options) => mutation.mutateAsync({ input, idempotencyKey: newIdempotencyKey() }, options),
  };
}
