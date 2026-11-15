import { useCallback, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Sentry from '@sentry/react-native';
import { DiscardedWriteError, OPTIMISTIC_WRITE_OPTIONS } from '@/lib/offlineWrites';
import { isOtherWritePending, settleWhenLast, type OptimisticWrite } from '@/lib/writeSettle';

/**
 * The one place that writes an optimistic change and rolls it back (ADR-019). Only for an action
 * whose result the person's own input and the cache fully determine, and that is safe to send twice.
 * Its writes pause offline and retry on a network error, a timeout or a 5xx (105a).
 */
interface OptimisticMutationConfig<TVariables, TCache> {
  /** The action's keys, request and settle step (`src/lib/optimisticWrites.ts`; its shape is in `writeSettle.ts`), shared with a write restored after a restart. */
  write: OptimisticWrite;
  /** The state the server is certain to produce, from the cache as it is now and the tap's input. */
  expected: (current: TCache, variables: TVariables) => TCache;
  /** What the person is told when the server rejects the call. Names the action. */
  failureMessage: string;
}

export interface OptimisticMutation<TVariables> {
  /** Changes the screen now and sends the request in the background. */
  mutate: (variables: TVariables) => void;
  /** The message for the last rejected call, or null. The screen renders it; it never reads a raw error. */
  failure: string | null;
  dismissFailure: () => void;
  /** True while a call this hook sent, matching `match`, has not yet settled (a queued one counts). */
  isInFlight: (match: (variables: TVariables) => boolean) => boolean;
}

export function useOptimisticMutation<TVariables, TCache>(
  config: OptimisticMutationConfig<TVariables, TCache>,
): OptimisticMutation<TVariables> {
  const { write, expected, failureMessage } = config;
  const queryClient = useQueryClient();
  const [failure, setFailure] = useState<string | null>(null);
  const inFlight = useRef<TVariables[]>([]);
  // Stable, so a screen can list it in an effect's dependencies.
  const dismissFailure = useCallback(() => setFailure(null), []);

  const mutation = useMutation<unknown, Error, TVariables, { previous: TCache | undefined }>({
    ...OPTIMISTIC_WRITE_OPTIONS,
    mutationKey: write.mutationKey,
    scope: { id: write.scope },
    mutationFn: write.mutationFn,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: write.queryKey });
      const previous = queryClient.getQueryData<TCache>(write.queryKey);
      if (previous !== undefined) queryClient.setQueryData<TCache>(write.queryKey, expected(previous, variables));
      return { previous };
    },
    onError: (error, _variables, context) => {
      // Sign-out emptied the cache; putting the saved one back would hand it to the next person.
      if (error instanceof DiscardedWriteError) return;
      setFailure(failureMessage);
      // With another write pending, the refetch after the last one corrects the screen; restoring
      // here would undo the later tap.
      if (isOtherWritePending(queryClient, write.scope)) return;
      Sentry.addBreadcrumb({ category: 'optimistic', message: 'Optimistic update reverted', level: 'warning', data: { mutationKey: write.mutationKey } });
      if (context?.previous !== undefined) queryClient.setQueryData<TCache>(write.queryKey, context.previous);
    },
    onSettled: (_data, error, variables) => {
      const index = inFlight.current.indexOf(variables);
      if (index !== -1) inFlight.current.splice(index, 1);
      settleWhenLast(queryClient, write, error);
    },
  });

  return {
    mutate: (variables) => {
      setFailure(null);
      inFlight.current.push(variables);
      mutation.mutate(variables);
    },
    failure,
    dismissFailure,
    isInFlight: (match) => inFlight.current.some(match),
  };
}
