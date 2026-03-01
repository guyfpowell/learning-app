import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { walletService } from '@/services/wallet.service';

export function useWalletBalance() {
  return useQuery({
    queryKey: ['wallet'],
    queryFn: () => walletService.getBalance(),
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
    qc.invalidateQueries({ queryKey: ['wallet'] });
}
