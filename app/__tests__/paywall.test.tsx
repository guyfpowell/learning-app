import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import PaywallScreen from '../paywall';
import { useOfferings, usePurchase, useRestorePurchases } from '@/hooks/useIAP';
import { PACKAGE_TYPE } from 'react-native-purchases';
import type { IAPOffering } from '@/hooks/useIAP';
import { makePackage } from '@/test-utils/purchases';
import { NO_SIGNAL_ERROR, OFFERINGS_LOAD_ERROR } from '@learning/shared';
import { PRICE_UNAVAILABLE } from '@/lib/paywallPlans';
import { NoSignalError } from '@/lib/offlineWrites';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack }) }));

jest.mock('@/hooks/useIAP', () => ({
  useOfferings:        jest.fn(),
  usePurchase:         jest.fn(),
  useRestorePurchases: jest.fn(),
}));

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockMonthly = makePackage(PACKAGE_TYPE.MONTHLY, { identifier: 'com.learning.app.premium.monthly', priceString: '£9.99' });
const mockAnnual  = makePackage(PACKAGE_TYPE.ANNUAL,  { identifier: 'com.learning.app.premium.annual',  priceString: '£79.99' });

const mockOffering: IAPOffering = { monthly: mockMonthly, annual: mockAnnual };

const mockPurchase = { mutate: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null as Error | null, reset: jest.fn() };
const mockRestore  = { mutate: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null as Error | null, reset: jest.fn() };

function setMocks(overrides: {
  offering?: IAPOffering | null;
  isLoading?: boolean;
  isError?: boolean;
  purchase?: typeof mockPurchase;
  restore?: typeof mockRestore;
} = {}) {
  const { offering = mockOffering, isLoading = false, isError = false, purchase = mockPurchase, restore = mockRestore } = overrides;
  (useOfferings as jest.Mock).mockReturnValue({
    data: offering ?? undefined,
    isLoading,
    isError,
  });
  (usePurchase as jest.Mock).mockReturnValue(purchase);
  (useRestorePurchases as jest.Mock).mockReturnValue(restore);
}

beforeEach(() => {
  jest.clearAllMocks();
  setMocks();
});

// ── Render ────────────────────────────────────────────────────────────────────

describe('PaywallScreen — render', () => {
  it('renders the Go Premium heading', () => {
    render(<PaywallScreen />);
    expect(screen.getByTestId('paywall-title')).toBeTruthy();
  });

  it('renders the monthly price from the offering', () => {
    render(<PaywallScreen />);
    expect(screen.getByTestId('plan-monthly-price')).toBeTruthy();
    expect(screen.getByText('£9.99')).toBeTruthy();
  });

  it('renders the annual price from the offering', () => {
    render(<PaywallScreen />);
    expect(screen.getByTestId('plan-annual-price')).toBeTruthy();
    expect(screen.getByText('£79.99')).toBeTruthy();
  });

  it('renders the auto-renew disclosure', () => {
    render(<PaywallScreen />);
    expect(screen.getByTestId('auto-renew-disclosure')).toBeTruthy();
  });

  it('renders the Terms of Use link', () => {
    render(<PaywallScreen />);
    expect(screen.getByTestId('terms-link')).toBeTruthy();
  });

  it('renders the Privacy Policy link', () => {
    render(<PaywallScreen />);
    expect(screen.getByTestId('privacy-link')).toBeTruthy();
  });

  it('renders a loading spinner while offerings load', () => {
    setMocks({ isLoading: true });
    render(<PaywallScreen />);
    expect(screen.getByTestId('paywall-loading')).toBeTruthy();
  });

  it('renders the subscribe button', () => {
    render(<PaywallScreen />);
    expect(screen.getByTestId('subscribe-btn')).toBeTruthy();
  });

  it('renders a close/back button', () => {
    render(<PaywallScreen />);
    expect(screen.getByTestId('paywall-close')).toBeTruthy();
  });
});

// ── Plan selection ─────────────────────────────────────────────────────────────

describe('PaywallScreen — plan selection', () => {
  it('annual plan is selected by default', () => {
    render(<PaywallScreen />);
    expect(screen.getByTestId('plan-annual-selected')).toBeTruthy();
  });

  it('tapping the monthly card selects monthly', () => {
    render(<PaywallScreen />);
    fireEvent.press(screen.getByTestId('plan-monthly-card'));
    expect(screen.getByTestId('plan-monthly-selected')).toBeTruthy();
  });

  it('switching selection deselects the other plan', () => {
    render(<PaywallScreen />);
    fireEvent.press(screen.getByTestId('plan-monthly-card'));
    expect(screen.queryByTestId('plan-annual-selected')).toBeNull();
  });
});

// ── Purchase ──────────────────────────────────────────────────────────────────

describe('PaywallScreen — subscribe', () => {
  it('pressing Subscribe calls usePurchase with the selected (annual) package', () => {
    render(<PaywallScreen />);
    fireEvent.press(screen.getByTestId('subscribe-btn'));
    expect(mockPurchase.mutate).toHaveBeenCalledWith(mockAnnual, expect.any(Object));
  });

  it('pressing Subscribe after switching to monthly calls with the monthly package', () => {
    render(<PaywallScreen />);
    fireEvent.press(screen.getByTestId('plan-monthly-card'));
    fireEvent.press(screen.getByTestId('subscribe-btn'));
    expect(mockPurchase.mutate).toHaveBeenCalledWith(mockMonthly, expect.any(Object));
  });

  it('subscribe button is disabled while purchase is pending', () => {
    setMocks({ purchase: { ...mockPurchase, isPending: true } });
    render(<PaywallScreen />);
    const btn = screen.getByTestId('subscribe-btn');
    expect(btn.props.accessibilityState?.disabled).toBe(true);
  });

  it('navigates back after a successful purchase', async () => {
    const successPurchase = {
      ...mockPurchase,
      mutate: jest.fn((_pkg, opts?: { onSuccess?: () => void }) => opts?.onSuccess?.()),
    };
    setMocks({ purchase: successPurchase });
    render(<PaywallScreen />);
    fireEvent.press(screen.getByTestId('subscribe-btn'));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
  });
});

// ── Navigation ────────────────────────────────────────────────────────────────

describe('PaywallScreen — navigation', () => {
  it('pressing the close button navigates back', () => {
    render(<PaywallScreen />);
    fireEvent.press(screen.getByTestId('paywall-close'));
    expect(mockBack).toHaveBeenCalled();
  });
});

// ── App Review requirements ───────────────────────────────────────────────────

describe('PaywallScreen — App Review requirements', () => {
  it('disclosure text mentions automatic renewal', () => {
    render(<PaywallScreen />);
    const disclosure = screen.getByTestId('auto-renew-disclosure');
    expect(disclosure.props.children).toMatch(/automatically renews/i);
  });

  it('disclosure text mentions cancellation in iOS Settings', () => {
    render(<PaywallScreen />);
    const disclosure = screen.getByTestId('auto-renew-disclosure');
    expect(disclosure.props.children).toMatch(/settings/i);
  });

  it('renders the Restore Purchases button', () => {
    render(<PaywallScreen />);
    expect(screen.getByTestId('restore-purchases-btn')).toBeTruthy();
  });
});

// ── Restore Purchases ─────────────────────────────────────────────────────────

// ── Expo Go / SDK unavailable (BUG-073b-2) ───────────────────────────────────
// When react-native-purchases cannot load (Expo Go, OTA builds), useOfferings
// resolves to { monthly: null, annual: null }.  The paywall must not crash and
// must show a sensible placeholder so the screen is still usable.

describe('PaywallScreen — Expo Go / SDK unavailable (BUG-073b-2)', () => {
  it('renders without crashing when offerings are unavailable', () => {
    setMocks({ offering: null });
    expect(() => render(<PaywallScreen />)).not.toThrow();
  });

  it('shows the placeholder price on both plans when offerings are null', () => {
    setMocks({ offering: null });
    render(<PaywallScreen />);
    expect([
      screen.getByTestId('plan-annual-price').props.children,
      screen.getByTestId('plan-monthly-price').props.children,
    ]).toEqual([PRICE_UNAVAILABLE, PRICE_UNAVAILABLE]);
  });
});

describe('PaywallScreen — offerings failed to load', () => {
  it('says the plans could not be loaded, never placeholder prices', () => {
    setMocks({ offering: null, isError: true });
    render(<PaywallScreen />);
    expect(screen.getByTestId('offerings-load-error').props.children).toBe(OFFERINGS_LOAD_ERROR);
    expect(screen.queryByText(PRICE_UNAVAILABLE)).toBeNull();
  });

  it('does not start a purchase', () => {
    setMocks({ offering: null, isError: true });
    render(<PaywallScreen />);
    fireEvent.press(screen.getByTestId('subscribe-btn'));
    expect(mockPurchase.mutate).not.toHaveBeenCalled();
  });

  it('pressing Subscribe does not crash when selectedPkg is null', () => {
    setMocks({ offering: null });
    render(<PaywallScreen />);
    expect(() => fireEvent.press(screen.getByTestId('subscribe-btn'))).not.toThrow();
    expect(mockPurchase.mutate).not.toHaveBeenCalled();
  });
});

describe('PaywallScreen — Restore Purchases (073b-8)', () => {
  it('pressing Restore Purchases calls useRestorePurchases.mutate', () => {
    render(<PaywallScreen />);
    fireEvent.press(screen.getByTestId('restore-purchases-btn'));
    expect(mockRestore.mutate).toHaveBeenCalled();
  });

  it('shows "Restoring…" while restore is pending', () => {
    setMocks({ restore: { ...mockRestore, isPending: true } });
    render(<PaywallScreen />);
    expect(screen.getByText(/Restoring…/i)).toBeTruthy();
  });

  it('shows restore error text on failure', () => {
    setMocks({ restore: { ...mockRestore, isError: true } });
    render(<PaywallScreen />);
    expect(screen.getByTestId('restore-error')).toBeTruthy();
  });

  it('restore button is disabled while restore is pending', () => {
    setMocks({ restore: { ...mockRestore, isPending: true } });
    render(<PaywallScreen />);
    const btn = screen.getByTestId('restore-purchases-btn');
    expect(btn.props.accessibilityState?.disabled).toBe(true);
  });
});

describe('payment with no signal (105g)', () => {
  it('a purchase that never left the phone says it was the signal', () => {
    setMocks({ purchase: { ...mockPurchase, isError: true, error: new NoSignalError() } });
    render(<PaywallScreen />);
    expect(screen.getByText(NO_SIGNAL_ERROR)).toBeTruthy();
  });

  it('a restore that never left the phone says it was the signal', () => {
    setMocks({ restore: { ...mockRestore, isError: true, error: new NoSignalError() } });
    render(<PaywallScreen />);
    expect(screen.getByTestId('restore-error').props.children).toBe(NO_SIGNAL_ERROR);
  });
});
