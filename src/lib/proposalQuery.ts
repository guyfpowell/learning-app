import { queryOptions } from '@tanstack/react-query';
import { proposalService } from '@/services/proposal.service';
import { proposalQueryKey } from '@/lib/queryKeys';
import { BREADCRUMB_CATEGORY, loggedLoad } from '@/lib/breadcrumbs';

/** The proposal fetch, logged on failure; the section shows the load error from the query's error state. */
function loadProposal(planId: string) {
  return loggedLoad(BREADCRUMB_CATEGORY.albert, 'Proposal load failed', () => proposalService.getProposal(planId), { planId });
}

/** The one key and fetch for a custom path's proposal. `useProposal` and the next-screen prefetch both use it, so they share a cache entry. */
export function proposalQueryOptions(planId: string) {
  return queryOptions({ queryKey: proposalQueryKey(planId), queryFn: () => loadProposal(planId) });
}
