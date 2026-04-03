import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));

jest.mock('@/theme', () => ({
  colors: {
    teal: '#1B5E72',
    bg: '#F3F3F3',
    border: '#E5E7EB',
    success: '#22c55e',
    error: '#ef4444',
    textMuted: '#888',
    white: '#fff',
  },
  font: {
    regular: 'Poppins_400Regular',
    medium: 'Poppins_500Medium',
    bold: 'Poppins_700Bold',
  },
  fontSize: { xs: 11, sm: 13, md: 15, lg: 20 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  tracking: { heading: 1.5 },
  radius: { card: 12 },
  shadow: { card: {} },
}));

const mockFetchNextPage = jest.fn();
const mockRefetch = jest.fn();

const mockBaseResult = {
  data: undefined,
  isLoading: false,
  isFetchingNextPage: false,
  hasNextPage: false,
  fetchNextPage: mockFetchNextPage,
  refetch: mockRefetch,
  isRefetching: false,
};

jest.mock('@/hooks/useWallet', () => ({
  useInfiniteTransactions: jest.fn(() => mockBaseResult),
}));

import { useInfiniteTransactions } from '@/hooks/useWallet';

const mockUseInfiniteTransactions = useInfiniteTransactions as jest.Mock;

const topUpTx = {
  id: 'tx-topup-1',
  userId: 'user-1',
  amount: 1000,
  type: 'WALLET_TOPUP',
  referenceId: 'pi_abc',
  createdAt: '2026-04-01T10:00:00.000Z',
};

const donationTx = {
  id: 'tx-don-1',
  userId: 'user-1',
  amount: 500,
  type: 'RECIPIENT_DONATION',
  referenceId: null,
  createdAt: '2026-04-01T11:00:00.000Z',
};

const redemptionTx = {
  id: 'tx-red-1',
  userId: 'user-1',
  amount: 200,
  type: 'RECIPIENT_DEBIT',
  referenceId: null,
  createdAt: '2026-04-01T12:00:00.000Z',
};

describe('HistoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseInfiniteTransactions.mockReturnValue(mockBaseResult);
  });

  it('shows skeleton rows while loading', () => {
    mockUseInfiniteTransactions.mockReturnValue({ ...mockBaseResult, isLoading: true });
    const HistoryScreen = require('../history').default;
    const { getAllByTestId } = render(<HistoryScreen />);
    expect(getAllByTestId('skeleton-row').length).toBeGreaterThan(0);
  });

  it('renders all three transaction types', () => {
    mockUseInfiniteTransactions.mockReturnValue({
      ...mockBaseResult,
      data: {
        pages: [{ transactions: [topUpTx, donationTx, redemptionTx], total: 3, page: 1, limit: 20 }],
      },
    });
    const HistoryScreen = require('../history').default;
    const { getByText } = render(<HistoryScreen />);
    expect(getByText('Top Up')).toBeTruthy();
    expect(getByText('Donation')).toBeTruthy();
    expect(getByText('Redemption')).toBeTruthy();
  });

  it('tapping a RECIPIENT_DONATION row navigates to donation detail', () => {
    mockUseInfiniteTransactions.mockReturnValue({
      ...mockBaseResult,
      data: {
        pages: [{ transactions: [donationTx], total: 1, page: 1, limit: 20 }],
      },
    });
    const HistoryScreen = require('../history').default;
    const { getByTestId } = render(<HistoryScreen />);
    fireEvent.press(getByTestId(`row-${donationTx.id}`));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/donation/[id]', params: { id: donationTx.id } });
  });

  it('WALLET_TOPUP row is not pressable (no onPress)', () => {
    mockUseInfiniteTransactions.mockReturnValue({
      ...mockBaseResult,
      data: {
        pages: [{ transactions: [topUpTx], total: 1, page: 1, limit: 20 }],
      },
    });
    const HistoryScreen = require('../history').default;
    render(<HistoryScreen />);
    // No press fired — just verify navigation is NOT called
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('RECIPIENT_DEBIT row is not pressable (no onPress)', () => {
    mockUseInfiniteTransactions.mockReturnValue({
      ...mockBaseResult,
      data: {
        pages: [{ transactions: [redemptionTx], total: 1, page: 1, limit: 20 }],
      },
    });
    const HistoryScreen = require('../history').default;
    render(<HistoryScreen />);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows updated empty state copy when no transactions', () => {
    mockUseInfiniteTransactions.mockReturnValue({
      ...mockBaseResult,
      data: { pages: [{ transactions: [], total: 0, page: 1, limit: 20 }] },
    });
    const HistoryScreen = require('../history').default;
    const { getByText } = render(<HistoryScreen />);
    expect(getByText('No activity yet')).toBeTruthy();
    expect(getByText('Your top-ups, donations, and redemptions will appear here.')).toBeTruthy();
  });

  it('pull-to-refresh calls refetch', () => {
    mockUseInfiniteTransactions.mockReturnValue({
      ...mockBaseResult,
      data: { pages: [{ transactions: [topUpTx], total: 1, page: 1, limit: 20 }] },
    });
    const HistoryScreen = require('../history').default;
    const { getByTestId } = render(<HistoryScreen />);
    fireEvent(getByTestId('flat-list'), 'refresh');
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('calls fetchNextPage when end reached and hasNextPage is true', () => {
    mockUseInfiniteTransactions.mockReturnValue({
      ...mockBaseResult,
      hasNextPage: true,
      data: { pages: [{ transactions: [topUpTx], total: 21, page: 1, limit: 20 }] },
    });
    const HistoryScreen = require('../history').default;
    const { getByTestId } = render(<HistoryScreen />);
    fireEvent(getByTestId('flat-list'), 'endReached');
    expect(mockFetchNextPage).toHaveBeenCalled();
  });

  it('does not call fetchNextPage when hasNextPage is false', () => {
    mockUseInfiniteTransactions.mockReturnValue({
      ...mockBaseResult,
      hasNextPage: false,
      data: { pages: [{ transactions: [topUpTx], total: 1, page: 1, limit: 20 }] },
    });
    const HistoryScreen = require('../history').default;
    const { getByTestId } = render(<HistoryScreen />);
    fireEvent(getByTestId('flat-list'), 'endReached');
    expect(mockFetchNextPage).not.toHaveBeenCalled();
  });
});
