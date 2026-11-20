import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isProposalGone } from '@learning/shared';
import { proposalService, type ProposalCall } from '@/services/proposal.service';
import { ACHIEVEMENTS_QUERY_KEY, PATHS_QUERY_KEY, proposalQueryKey } from '@/lib/queryKeys';
import { proposalQueryOptions } from '@/lib/proposalQuery';
import { errorCode } from '@/lib/errors';
import { requireSignal } from '@/lib/offlineWrites';
import { enqueueRewards } from '@/lib/rewards';

/** The checked proposal on one custom path. Fetched only while the path's badge (`hasProposal`) is on. */
export function useProposal(planId: string, enabled: boolean) {
  return useQuery({ ...proposalQueryOptions(planId), enabled });
}

/**
 * Accept or decline a proposal's change or move. Afterwards the paths, the proposal and the achievements are refetched:
 * an accepted change with a move now returns the move card, a decline clears the badge. A proposal that
 * moved on (409/404) is refetched the same way, so the card follows the server.
 */
export function useDecideProposal(planId: string) {
  const queryClient = useQueryClient();
  const refetch = () => {
    void queryClient.invalidateQueries({ queryKey: PATHS_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: proposalQueryKey(planId) });
    void queryClient.invalidateQueries({ queryKey: ACHIEVEMENTS_QUERY_KEY });
  };
  return useMutation({
    // Never paused or retried: with no signal it fails at once (ADR-021 Decision 6).
    mutationFn: (call: ProposalCall) => requireSignal(() => proposalService.decide(call)),
    onSuccess: ({ rewards }) => {
      enqueueRewards(rewards);
      refetch();
    },
    onError: (err) => { if (isProposalGone(errorCode(err))) refetch(); },
  });
}
