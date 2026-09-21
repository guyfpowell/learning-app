import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import PaywallScreen from '../paywall';
import { useOfferings, usePurchase } from '@/hooks/useIAP';
import { PACKAGE_TYPE } from 'react-native-purchases';
import type { PurchasesPackage, IAPOffering } from '@/hooks/useIAP';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack }) }));

jest.mock('@/hooks/useIAP', () => ({
  useOfferings: jest.fn(),
  usePurchase:  jest.fn(),
}));

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Minimal fixtures — cast to avoid reproducing every required field
const mockMonthly = {
  packageType:        PACKAGE_TYPE.MONTHLY,
  offeringIdentifier: 'default',
  product: { identifier: 'com.learning.app.premium.monthly', priceString: '£9.99' },
} as unknown as PurchasesPackage;

const mockAnnual = {
  packageType:        PACKAGE_TYPE.ANNUAL,
  offeringIdentifier: 'default',
  product: { identifier: 'com.learning.app.premium.annual', priceString: '£79.99' },
} as unknown as PurchasesPackage;

const mockOffering: IAPOffering = { monthly: mockMonthly, annual: mockAnnual };

const mockPurchase = { mutate: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null, reset: jest.fn() };

function setMocks(overrides: {
  offering?: IAPOffering | null;
  isLoading?: boolean;
  purchase?: typeof mockPurchase;
} = {}) {
  const { offering = mockOffering, isLoading = false, purchase = mockPurchase } = overrides;
  (useOfferings as jest.Mock).mockReturnValue({
    data: offering ?? undefined,
    isLoading,
    isError: false,
  });
  (usePurchase as jest.Mock).mockReturnValue(purchase);
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
});
