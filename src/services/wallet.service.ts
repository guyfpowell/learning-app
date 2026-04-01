import api from '@/lib/api';
import type { WalletBalance, TopUpIntentResponse, CheckoutResponse } from '@pocketchange/shared';
import type { Transaction } from '@/types';

export type { WalletBalance, TopUpIntentResponse as TopUpResponse, CheckoutResponse };

export interface TransactionsResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
}

export const walletService = {
  async getBalance(): Promise<WalletBalance> {
    const { data } = await api.get<WalletBalance>('/users/me/wallet');
    return data;
  },

  async createTopUp(amountPence: number): Promise<TopUpIntentResponse> {
    const { data } = await api.post<TopUpIntentResponse>('/users/me/wallet/topup', {
      amount: amountPence,
    });
    return data;
  },

  async createCheckout(amountPence: number): Promise<CheckoutResponse> {
    const { data } = await api.post<CheckoutResponse>('/users/me/wallet/checkout', {
      amount: amountPence,
    });
    return data;
  },

  async getTransactions(page = 1, limit = 20): Promise<TransactionsResponse> {
    const { data } = await api.get<{ data: Transaction[]; total: number; page: number; limit: number }>(
      `/users/me/transactions?page=${page}&limit=${limit}`
    );
    // Backend returns { data: [...] } — remap to { transactions: [...] } for consistency
    return { transactions: data.data, total: data.total, page: data.page, limit: data.limit };
  },
};
