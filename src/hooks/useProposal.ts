import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Sentry from '@sentry/react-native';
import { isProposalGone } from '@learning/shared';
import { proposalService, type ProposalCall } from '@/services/proposal.service';
import { PATHS_QUERY_KEY, proposalQueryKey } from '@/lib/queryKeys';
import { errorCode } from '@/lib/errors';

/** The proposal fetch, logged on failure; the section shows the load error from the query's error state. */
async function loadProposal(planId: string) {
  try {
    return await proposalService.getProposal(planId);
  } catch (err) {
    Sentry.addBreadcrumb({ category: 'albert', message: 'Proposal load failed', level: 'warning', data: { err: String(err) } });
    throw err;
  }
}

/** The checked proposal on one custom path. Fetched only while the path's badge (`hasProposal`) is on. */
export function useProposal(planId: string, enabled: boolean) {
  return useQuery({
    queryKey: proposalQueryKey(planId),
    queryFn: () => loadProposal(planId),
    enabled,
  });
}

/**
 * Accept or decline a proposal's change or move. Afterwards the paths and the proposal are refetched:
 * an accepted change with a move now returns the move card, a decline clears the badge. A proposal that
 * moved on (409/404) is refetched the same way, so the card follows the server.
 */
export function useDecideProposal(planId: string) {
  const queryClient = useQueryClient();
  const refetch = () => {
    void queryClient.invalidateQueries({ queryKey: PATHS_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: proposalQueryKey(planId) });
  };
  return useMutation({
    mutationFn: (call: ProposalCall) => proposalService.decide(call),
    onSuccess: refetch,
    onError: (err) => { if (isProposalGone(errorCode(err))) refetch(); },
  });
}
