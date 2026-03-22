import api from '@/lib/api';
import type { RecipientSelfProfile, RecipientTransaction, Paginated } from '@/types';

export const recipientSelfService = {
  async getProfile(): Promise<RecipientSelfProfile> {
    const { data } = await api.get<RecipientSelfProfile>('/recipients/me');
    return data;
  },

  async getTransactions(page = 1, limit = 20): Promise<Paginated<RecipientTransaction>> {
    const { data } = await api.get<Paginated<RecipientTransaction>>(
      `/recipients/me/transactions?page=${page}&limit=${limit}`
    );
    return data;
  },
};
