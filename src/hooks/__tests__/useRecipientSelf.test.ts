import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useRecipientSelfProfile, useRecipientSelfTransactions } from '../useRecipientSelf';
import { recipientSelfService } from '@/services/recipient.self.service';

jest.mock('@/services/recipient.self.service', () => ({
  recipientSelfService: {
    getProfile: jest.fn(),
    getTransactions: jest.fn(),
  },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

const mockService = recipientSelfService as jest.Mocked<typeof recipientSelfService>;

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

const mockProfile = {
  id: 'rec-1',
  firstName: 'Jay',
  lastName: 'Smith',
  nickname: 'Jay',
  shortCode: 'ABC123',
  qrToken: 'qr-uuid-token',
  status: 'ACTIVE' as const,
  balance: 1500,
};

describe('useRecipientSelfProfile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the recipient profile', async () => {
    mockService.getProfile.mockResolvedValueOnce(mockProfile);

    const { result } = renderHook(() => useRecipientSelfProfile(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('rec-1');
    expect(result.current.data?.balance).toBe(1500);
    expect(result.current.data?.qrToken).toBe('qr-uuid-token');
  });
});

describe('useRecipientSelfTransactions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns paginated transactions', async () => {
    mockService.getTransactions.mockResolvedValueOnce({
      data: [
        {
          id: 'tx-1',
          type: 'RECIPIENT_DONATION',
          amount: 500,
          createdAt: '2026-01-01T00:00:00Z',
          counterpartyLabel: 'donor@example.com',
          lineItems: [],
        },
      ],
      page: 1,
      limit: 20,
      total: 1,
    });

    const { result } = renderHook(() => useRecipientSelfTransactions(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].data).toHaveLength(1);
    expect(result.current.data?.pages[0].data[0].type).toBe('RECIPIENT_DONATION');
  });

  it('returns no next page when on last page', async () => {
    mockService.getTransactions.mockResolvedValueOnce({
      data: [],
      page: 1,
      limit: 20,
      total: 0,
    });

    const { result } = renderHook(() => useRecipientSelfTransactions(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });
});
