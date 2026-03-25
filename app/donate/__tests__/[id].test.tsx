import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import DonateScreen from '../[id]';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('@/services/donation.service', () => ({
  donationService: {
    donateByToken: jest.fn(),
    donateById: jest.fn(),
  },
}));

jest.mock('@/hooks/useWallet', () => ({
  useInvalidateWallet: () => jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({
    id: 'rec-1',
    token: undefined,
    displayName: 'Test User',
  }),
  useRouter: () => ({ back: jest.fn(), replace: jest.fn() }),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

import { donationService } from '@/services/donation.service';
const mockDonateById = donationService.donateById as jest.Mock;
const mockDonateByToken = donationService.donateByToken as jest.Mock;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderScreen() {
  return render(React.createElement(DonateScreen));
}

function advanceToConfirm() {
  fireEvent.changeText(screen.getByPlaceholderText('0.00'), '5.00');
  fireEvent.press(screen.getByText('NEXT'));
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('DonateScreen — idempotency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls donateById with an Idempotency-Key header on confirm', async () => {
    mockDonateById.mockResolvedValueOnce({ donationId: 'don-1' });
    renderScreen();
    advanceToConfirm();

    await act(async () => {
      fireEvent.press(screen.getByText('CONFIRM & DONATE'));
    });

    await waitFor(() => expect(mockDonateById).toHaveBeenCalledTimes(1));

    const [, , idempotencyKey] = mockDonateById.mock.calls[0];
    expect(typeof idempotencyKey).toBe('string');
    expect((idempotencyKey as string).length).toBeGreaterThan(0);
  });

  it('pressing Confirm & donate twice fires the service only once', async () => {
    // Never resolve — simulates slow network
    mockDonateById.mockReturnValue(new Promise(() => {}));
    renderScreen();
    advanceToConfirm();

    fireEvent.press(screen.getByText('CONFIRM & DONATE'));
    // Attempt a second press immediately — button should already be gone / disabled
    try {
      fireEvent.press(screen.getByText('CONFIRM & DONATE'));
    } catch {
      // Expected: button not in tree during processing
    }

    expect(mockDonateById).toHaveBeenCalledTimes(1);
  });

  it('re-enables the button and generates a new idempotency key on failure', async () => {
    const error = { response: { data: { error: 'Insufficient funds' } } };
    mockDonateById
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({ donationId: 'don-2' });

    renderScreen();
    advanceToConfirm();

    // First attempt — fails
    await act(async () => {
      fireEvent.press(screen.getByText('CONFIRM & DONATE'));
    });

    await waitFor(() => expect(screen.getByText('Donation failed')).toBeTruthy());

    // Tap "Try again" — returns to confirm step
    fireEvent.press(screen.getByText('TRY AGAIN'));

    // Second attempt
    await act(async () => {
      fireEvent.press(screen.getByText('CONFIRM & DONATE'));
    });

    await waitFor(() => expect(mockDonateById).toHaveBeenCalledTimes(2));

    const firstKey = mockDonateById.mock.calls[0][2] as string;
    const secondKey = mockDonateById.mock.calls[1][2] as string;

    expect(firstKey).toBeDefined();
    expect(secondKey).toBeDefined();
    expect(firstKey).not.toBe(secondKey);
  });

  it('shows success state after successful donation', async () => {
    mockDonateById.mockResolvedValueOnce({ donationId: 'don-3' });
    renderScreen();
    advanceToConfirm();

    await act(async () => {
      fireEvent.press(screen.getByText('CONFIRM & DONATE'));
    });

    await waitFor(() => expect(screen.getByText('Donation sent!')).toBeTruthy());
  });

});
