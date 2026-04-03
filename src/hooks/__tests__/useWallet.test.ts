import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useWalletBalance, useTransactions, useInfiniteTransactions, useCreateTopUp, useInvalidateWallet } from '../useWallet';
import { walletService } from '@/services/wallet.service';

jest.mock('@/services/wallet.service', () => ({
  walletService: {
    getBalance: jest.fn(),
    createTopUp: jest.fn(),
    getTransactions: jest.fn(),
  },
}));

const mockWalletService = walletService as jest.Mocked<typeof walletService>;

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useWalletBalance', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches wallet balance', async () => {
    mockWalletService.getBalance.mockResolvedValueOnce({ walletBalance: 3000 });

    const { result } = renderHook(() => useWalletBalance(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.walletBalance).toBe(3000);
    expect(mockWalletService.getBalance).toHaveBeenCalledTimes(1);
  });

  it('handles fetch error', async () => {
    mockWalletService.getBalance.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useWalletBalance(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useTransactions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches transactions with default pagination', async () => {
    const mockData = {
      transactions: [{ id: 'txn-1', userId: 'u1', amount: 500, type: 'WALLET_TOPUP' as const, referenceId: null, createdAt: '2024-01-01T00:00:00Z' }],
      total: 1,
      page: 1,
      limit: 20,
    };
    mockWalletService.getTransactions.mockResolvedValueOnce(mockData);

    const { result } = renderHook(() => useTransactions(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
    expect(mockWalletService.getTransactions).toHaveBeenCalledWith(1, 20);
  });
});

describe('useInfiniteTransactions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches first page and exposes transactions', async () => {
    const page1 = {
      transactions: [
        { id: 'tx-1', userId: 'u1', amount: 1000, type: 'WALLET_TOPUP' as const, referenceId: null, createdAt: '2026-04-01T00:00:00Z' },
      ],
      total: 1,
      page: 1,
      limit: 20,
    };
    mockWalletService.getTransactions.mockResolvedValueOnce(page1);

    const { result } = renderHook(() => useInfiniteTransactions(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].transactions).toHaveLength(1);
    expect(mockWalletService.getTransactions).toHaveBeenCalledWith(1, 20);
  });

  it('getNextPageParam returns undefined when all items fetched', async () => {
    const page1 = { transactions: [{ id: 'tx-1', userId: 'u1', amount: 500, type: 'RECIPIENT_DONATION' as const, referenceId: null, createdAt: '2026-04-01T00:00:00Z' }], total: 1, page: 1, limit: 20 };
    mockWalletService.getTransactions.mockResolvedValueOnce(page1);

    const { result } = renderHook(() => useInfiniteTransactions(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });
});

describe('useCreateTopUp', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls wallet service createTopUp with amount', async () => {
    mockWalletService.createTopUp.mockResolvedValueOnce({ clientSecret: 'pi_secret' });

    const { result } = renderHook(() => useCreateTopUp(), { wrapper: makeWrapper() });

    result.current.mutate(1000);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockWalletService.createTopUp).toHaveBeenCalledWith(1000);
    expect(result.current.data?.clientSecret).toBe('pi_secret');
  });
});

describe('useInvalidateWallet', () => {
  it('returns a function that can be called without throwing', () => {
    const { result } = renderHook(() => useInvalidateWallet(), { wrapper: makeWrapper() });
    expect(typeof result.current).toBe('function');
    expect(() => result.current()).not.toThrow();
  });
});
