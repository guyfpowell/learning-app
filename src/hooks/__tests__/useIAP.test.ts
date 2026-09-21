import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { iapService } from '@/services/iap.service';
import { subscriptionService } from '@/services/subscription.service';
import { useOfferings, usePurchase } from '../useIAP';
import type { PurchasesPackage, IAPOffering } from '../useIAP';
import { PACKAGE_TYPE } from 'react-native-purchases';
import type { EntitlementResult } from '@learning/shared';

jest.mock('@/services/iap.service', () => ({
  iapService: {
    getOfferings:    jest.fn(),
    purchasePackage: jest.fn(),
  },
}));

jest.mock('@/services/subscription.service', () => ({
  subscriptionService: {
    verifyPurchase: jest.fn(),
  },
}));

// Cast to avoid reproducing every required field; the hook only cares about
// the shape passed through, not the field names.
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

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client }, children);
}

describe('useOfferings', () => {
  it('returns monthly and annual packages on success', async () => {
    const offering: IAPOffering = { monthly: mockMonthly, annual: mockAnnual };
    (iapService.getOfferings as jest.Mock).mockResolvedValue(offering);

    const { result } = renderHook(() => useOfferings(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect((result.current.data?.monthly?.product as { priceString: string }).priceString).toBe('£9.99');
    expect((result.current.data?.annual?.product as { priceString: string }).priceString).toBe('£79.99');
  });

  it('exposes isLoading while the query is in flight', () => {
    (iapService.getOfferings as jest.Mock).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useOfferings(), { wrapper });
    expect(result.current.isLoading).toBe(true);
  });

  it('surfaces errors when getOfferings rejects', async () => {
    (iapService.getOfferings as jest.Mock).mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useOfferings(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

const PREMIUM_ENTITLEMENT: EntitlementResult = {
  tier:            'premium',
  source:          'subscription',
  expiresAt:       null,
  remainingBudget: 3,
};

const PURCHASE_RESULT = {
  originalTransactionId: 'apple-txn-id-1',
  productId:             'com.ascentlearning.premium_monthly',
};

describe('usePurchase', () => {
  beforeEach(() => {
    // Clear call counts between tests so not.toHaveBeenCalled() only sees this test's calls.
    jest.clearAllMocks();
  });

  it('calls iapService.purchasePackage then subscriptionService.verifyPurchase', async () => {
    (iapService.purchasePackage as jest.Mock).mockResolvedValue(PURCHASE_RESULT);
    (subscriptionService.verifyPurchase as jest.Mock).mockResolvedValue(PREMIUM_ENTITLEMENT);
    const { result } = renderHook(() => usePurchase(), { wrapper });

    await act(async () => {
      result.current.mutate(mockMonthly);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(iapService.purchasePackage).toHaveBeenCalledWith(mockMonthly);
    expect(subscriptionService.verifyPurchase).toHaveBeenCalledWith(PURCHASE_RESULT);
  });

  it('invalidates track-contents, lesson, enrollments and user-profile on success', async () => {
    (iapService.purchasePackage as jest.Mock).mockResolvedValue(PURCHASE_RESULT);
    (subscriptionService.verifyPurchase as jest.Mock).mockResolvedValue(PREMIUM_ENTITLEMENT);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const customWrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => usePurchase(), { wrapper: customWrapper });

    await act(async () => {
      result.current.mutate(mockMonthly);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['track-contents'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['lesson'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['enrollments'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['user-profile'] });
  });

  it('exposes error when purchasePackage rejects', async () => {
    (iapService.purchasePackage as jest.Mock).mockRejectedValue(new Error('User cancelled'));
    const { result } = renderHook(() => usePurchase(), { wrapper });

    await act(async () => {
      result.current.mutate(mockMonthly);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(subscriptionService.verifyPurchase).not.toHaveBeenCalled();
  });

  it('exposes error when verifyPurchase rejects', async () => {
    (iapService.purchasePackage as jest.Mock).mockResolvedValue(PURCHASE_RESULT);
    (subscriptionService.verifyPurchase as jest.Mock).mockRejectedValue(new Error('Server error'));
    const { result } = renderHook(() => usePurchase(), { wrapper });

    await act(async () => {
      result.current.mutate(mockMonthly);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
