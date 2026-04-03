import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { walletService } from '@/services/wallet.service';

const HISTORY_PAGE_SIZE = 20;

export function useWalletBalance() {
  return useQuery({
    queryKey: ['wallet'],
    queryFn: () => walletService.getBalance(),
    refetchOnMount: 'stale',
  });
}

export function useInfiniteTransactions() {
  return useInfiniteQuery({
    queryKey: ['transactions', 'infinite'],
    queryFn: ({ pageParam }) => walletService.getTransactions(pageParam, HISTORY_PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const fetched = (lastPage.page - 1) * lastPage.limit + lastPage.transactions.length;
      return fetched < lastPage.total ? lastPage.page + 1 : undefined;
    },
  });
}

export function useTransactions(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['transactions', page, limit],
    queryFn: () => walletService.getTransactions(page, limit),
  });
}

export function useCreateTopUp() {
  return useMutation({
    mutationFn: (amountPence: number) => walletService.createTopUp(amountPence),
  });
}

/** Call after a successful top-up to refresh the balance. */
export function useInvalidateWallet() {
  const qc = useQueryClient();
  return () =>
    qc.refetchQueries({ queryKey: ['wallet'] });
}
