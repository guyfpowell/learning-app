import type { QueryClient } from '@tanstack/react-query';
import type { ActivePathRef } from '@learning/shared';
import { trackService } from '@/services/track.service';
import { PATHS_QUERY_KEY } from '@/lib/queryKeys';
import { PATHS_WRITE_SCOPE, SET_ACTIVE_PATH_MUTATION_KEY } from '@/lib/mutationKeys';
import { OPTIMISTIC_WRITE_OPTIONS, assertWriteNotDiscarded } from '@/lib/offlineWrites';
import { settleWhenLast, type OptimisticWrite } from '@/lib/writeSettle';
import { invalidatePathQueries } from '@/lib/pathInvalidation';

function activePathRefOf(value: unknown): ActivePathRef {
  if (typeof value === 'object' && value !== null && 'kind' in value && 'id' in value
    && (value.kind === 'track' || value.kind === 'custom') && typeof value.id === 'string') {
    return { kind: value.kind, id: value.id };
  }
  throw new Error('A saved "make active" write has no path');
}

export const SET_ACTIVE_PATH_WRITE: OptimisticWrite = {
  mutationKey: SET_ACTIVE_PATH_MUTATION_KEY,
  scope: PATHS_WRITE_SCOPE,
  queryKey: PATHS_QUERY_KEY,
  mutationFn: (variables) => {
    assertWriteNotDiscarded(variables);
    return trackService.setActivePath(activePathRefOf(variables));
  },
  settle: invalidatePathQueries,
};

export const OPTIMISTIC_WRITES: readonly OptimisticWrite[] = [SET_ACTIVE_PATH_WRITE];

/** Gives a write restored after a restart its request, its retry rule and its settle step. */
export function registerOptimisticWrites(client: QueryClient): void {
  for (const write of OPTIMISTIC_WRITES) {
    client.setMutationDefaults(write.mutationKey, {
      ...OPTIMISTIC_WRITE_OPTIONS,
      scope: { id: write.scope },
      mutationFn: write.mutationFn,
      onSettled: (_data, error) => settleWhenLast(client, write, error),
    });
  }
}
