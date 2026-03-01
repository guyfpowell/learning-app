import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { donationService } from '@/services/donation.service';
import type { SpendBreakdown } from '@/types';

const PAGE_SIZE = 20;

/**
 * Infinite-scroll query for the donor's full donation history.
 * Fetches 20 items per page; call fetchNextPage() when the list end is reached.
 */
export function useDonationHistory() {
  return useInfiniteQuery({
    queryKey: ['donations'],
    queryFn: ({ pageParam }) =>
      donationService.getDonationHistory(pageParam, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const fetched = (lastPage.page - 1) * lastPage.limit + lastPage.donations.length;
      return fetched < lastPage.total ? lastPage.page + 1 : undefined;
    },
  });
}

/**
 * Fetches the spend breakdown for a single donation.
 * Enabled only when a donationId is present.
 */
export function useSpendBreakdown(donationId: string) {
  return useQuery<SpendBreakdown>({
    queryKey: ['spend-breakdown', donationId],
    queryFn: () => donationService.getSpendBreakdown(donationId),
    enabled: !!donationId,
    staleTime: 30_000,
  });
}
