import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Sentry from '@sentry/react-native';
import { SITUATION_OUTCOME, SITUATION_POLL_MS } from '@learning/shared';
import { situationChangeService } from '@/services/situationChange.service';
import { situationChangeQueryKey } from '@/lib/queryKeys';

// The words are personal (079h): the breadcrumbs carry the error, never the text or the response.
function logFailure(message: string, err: unknown) {
  Sentry.addBreadcrumb({ category: 'albert', message, level: 'warning', data: { err: String(err) } });
}

async function loadLatest(planId: string) {
  try {
    return await situationChangeService.getLatest(planId);
  } catch (err) {
    logFailure('Situation change load failed', err);
    throw err;
  }
}

/**
 * The newest situation change on one custom path. While Albert is looking (`running`) it is read again
 * every `SITUATION_POLL_MS`, which is the response-driven "looking at this" state; a failed read stops
 * the polling and shows in the query's error state.
 */
export function useLatestSituationChange(planId: string, enabled: boolean) {
  return useQuery({
    queryKey: situationChangeQueryKey(planId),
    queryFn: () => loadLatest(planId),
    enabled,
    refetchInterval: query => (query.state.status !== 'error' && query.state.data?.outcome === SITUATION_OUTCOME.running ? SITUATION_POLL_MS : false),
  });
}

/** Tells Albert the situation changed. The stored change (`running`) goes straight into the latest-change cache, which starts the polling. */
export function useCreateSituationChange(planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => situationChangeService.create(planId, text),
    onSuccess: created => { queryClient.setQueryData(situationChangeQueryKey(planId), created); },
    onError: err => { logFailure('Situation change send failed', err); },
  });
}
