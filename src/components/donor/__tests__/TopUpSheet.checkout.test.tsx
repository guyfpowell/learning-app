import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { TopUpSheet } from '../TopUpSheet';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('@/config/features', () => ({
  features: { stripePayments: false, stripeCheckout: true },
}));

jest.mock('@/services/wallet.service', () => ({
  walletService: { createCheckout: jest.fn() },
}));

jest.mock('@/hooks/useWallet', () => ({
  useInvalidateWallet: () => mockInvalidateWallet,
  useCreateTopUp: () => ({ mutateAsync: jest.fn(), reset: jest.fn() }),
}));

jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
}));

jest.mock('@gorhom/bottom-sheet', () => {
  const { View } = require('react-native');
  const { forwardRef } = require('react');
  const BottomSheet = forwardRef(({ children }: { children: unknown }, _ref: unknown) =>
    require('react').createElement(View, null, children)
  );
  BottomSheet.displayName = 'BottomSheet';
  return {
    __esModule: true,
    default: BottomSheet,
    BottomSheetView: ({ children }: { children: unknown }) =>
      require('react').createElement(require('react-native').View, null, children),
    BottomSheetBackdrop: () => null,
  };
});

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// ─── Mock function references ─────────────────────────────────────────────────

import { walletService } from '@/services/wallet.service';
import * as WebBrowser from 'expo-web-browser';

const mockCreateCheckout = walletService.createCheckout as jest.Mock;
const mockOpenAuthSession = WebBrowser.openAuthSessionAsync as jest.Mock;
const mockInvalidateWallet = jest.fn().mockResolvedValue(undefined);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderSheet() {
  const sheetRef = { current: { close: jest.fn() } } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  render(<TopUpSheet sheetRef={sheetRef} />);
  return sheetRef;
}

async function enterAmountAndContinue(amount = '5.00') {
  fireEvent.changeText(screen.getByPlaceholderText('e.g. 10.00'), amount);
  fireEvent.press(screen.getByText('CONTINUE'));
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CheckoutTopUpContent — URL matching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateCheckout.mockResolvedValue({ url: 'https://checkout.stripe.com/pay/cs_test_abc' });
    mockInvalidateWallet.mockResolvedValue(undefined);
  });

  it('shows success step when result.url includes status=success', async () => {
    mockOpenAuthSession.mockResolvedValue({
      type: 'success',
      url: 'pocketchange://topup-complete?status=success',
    });

    renderSheet();
    await enterAmountAndContinue();

    await waitFor(() => {
      expect(screen.getByText('Top up complete!')).toBeTruthy();
    });
    expect(mockInvalidateWallet).toHaveBeenCalledTimes(1);
  });

  it('returns to amount step when result.url includes status=cancel', async () => {
    mockOpenAuthSession.mockResolvedValue({
      type: 'success',
      url: 'pocketchange://topup-complete?status=cancel',
    });

    renderSheet();
    await enterAmountAndContinue();

    await waitFor(() => {
      expect(screen.getByText('TOP UP WALLET')).toBeTruthy();
      expect(screen.getByPlaceholderText('e.g. 10.00')).toBeTruthy();
    });
    expect(mockInvalidateWallet).not.toHaveBeenCalled();
  });

  it('returns to amount step when result.type is cancel', async () => {
    mockOpenAuthSession.mockResolvedValue({ type: 'cancel' });

    renderSheet();
    await enterAmountAndContinue();

    await waitFor(() => {
      expect(screen.getByText('TOP UP WALLET')).toBeTruthy();
    });
    expect(mockInvalidateWallet).not.toHaveBeenCalled();
  });

  it('does NOT match old topup-success URL scheme', async () => {
    // Old path-based scheme should NOT trigger success after the change
    mockOpenAuthSession.mockResolvedValue({
      type: 'success',
      url: 'pocketchange://topup-success',
    });

    renderSheet();
    await enterAmountAndContinue();

    await waitFor(() => {
      // Falls through to else branch — wallet invalidated but stays at amount step
      expect(screen.queryByText('Top up complete!')).toBeNull();
    });
  });
});
