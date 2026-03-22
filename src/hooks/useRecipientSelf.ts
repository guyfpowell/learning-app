import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { recipientSelfService } from '@/services/recipient.self.service';
import type { RecipientSelfProfile, RecipientTransaction, Paginated } from '@/types';

export function useRecipientSelfProfile() {
  return useQuery<RecipientSelfProfile>({
    queryKey: ['recipient', 'self'],
    queryFn: () => recipientSelfService.getProfile(),
    staleTime: 30_000,
  });
}

export function useRecipientSelfTransactions() {
  return useInfiniteQuery<Paginated<RecipientTransaction>>({
    queryKey: ['recipient', 'self', 'transactions'],
    queryFn: ({ pageParam = 1 }) =>
      recipientSelfService.getTransactions(pageParam as number, 20),
    getNextPageParam: (lastPage) => {
      const totalPages = Math.ceil(lastPage.total / lastPage.limit);
      return lastPage.page < totalPages ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 30_000,
  });
}
