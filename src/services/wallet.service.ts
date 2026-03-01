import api from '@/lib/api';
import type { Transaction } from '@/types';

export interface WalletBalance {
  walletBalance: number;
}

export interface TopUpResponse {
  clientSecret: string;
}

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

  async createTopUp(amountPence: number): Promise<TopUpResponse> {
    const { data } = await api.post<TopUpResponse>('/users/me/wallet/topup', {
      amount: amountPence,
    });
    return data;
  },

  async getTransactions(page = 1, limit = 20): Promise<TransactionsResponse> {
    const { data } = await api.get<TransactionsResponse>(
      `/users/me/transactions?page=${page}&limit=${limit}`
    );
    return data;
  },
};
