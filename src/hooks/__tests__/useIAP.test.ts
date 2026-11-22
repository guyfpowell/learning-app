import { renderHook, act, waitFor } from '@testing-library/react-native';
import * as Sentry from '@sentry/react-native';
import { onlineManager } from '@tanstack/react-query';
import { NoSignalError } from '@/lib/offlineWrites';
import { BREADCRUMB_CATEGORY } from '@/lib/breadcrumbs';
import {
  LESSONS_QUERY_KEY,
  PATHS_QUERY_KEY,
  TRACK_CONTENTS_QUERY_KEY,
  USER_PROFILE_QUERY_KEY,
} from '@/lib/queryKeys';
import { useAuthStore } from '@/store/auth.store';
import { createTestQueryClient, queryWrapper } from '@/test-utils/queryClient';
import { iapService } from '@/services/iap.service';
import { subscriptionService } from '@/services/subscription.service';
import { useOfferings, usePurchase, useRestorePurchases } from '../useIAP';
import type { IAPOffering } from '../useIAP';
import { makePackage } from '@/test-utils/purchases';
import { PACKAGE_TYPE } from 'react-native-purchases';
import type { EntitlementResult } from '@learning/shared';

jest.mock('@/services/iap.service', () => ({
  iapService: {
    getOfferings:     jest.fn(),
    purchasePackage:  jest.fn(),
    restorePurchases: jest.fn(),
  },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/services/subscription.service', () => ({
  subscriptionService: {
    verifyPurchase: jest.fn(),
  },
}));

const SIGNED_IN_USER = { id: 'user-abc', email: 'user@example.com', name: 'Test User' };

// Every payment hook reads the signed-in user's ID from the auth store (132a).
// Mock calls are cleared so not.toHaveBeenCalled() only sees this test's calls.
beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ user: SIGNED_IN_USER, accessToken: 'access' });
});
afterEach(() => {
  useAuthStore.setState({ user: null, accessToken: null });
});

const mockMonthly = makePackage(PACKAGE_TYPE.MONTHLY, { identifier: 'com.learning.app.premium.monthly', priceString: '£9.99' });
const mockAnnual  = makePackage(PACKAGE_TYPE.ANNUAL,  { identifier: 'com.learning.app.premium.annual',  priceString: '£79.99' });

describe('useOfferings', () => {
  it('returns monthly and annual packages on success', async () => {
    const offering: IAPOffering = { monthly: mockMonthly, annual: mockAnnual };
    (iapService.getOfferings as jest.Mock).mockResolvedValue(offering);

    const { result } = renderHook(() => useOfferings(), { wrapper: queryWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.monthly?.product.priceString).toBe('£9.99');
    expect(result.current.data?.annual?.product.priceString).toBe('£79.99');
  });

  it('exposes isLoading while the query is in flight', () => {
    (iapService.getOfferings as jest.Mock).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useOfferings(), { wrapper: queryWrapper() });
    expect(result.current.isLoading).toBe(true);
  });

  it('logs a failed load and keeps the error for the paywall', async () => {
    (iapService.getOfferings as jest.Mock).mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useOfferings(), { wrapper: queryWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
      category: BREADCRUMB_CATEGORY.iap,
      message:  'Offerings load failed',
      level:    'warning',
      data:     { err: 'Error: network' },
    });
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
  it('calls iapService.purchasePackage then subscriptionService.verifyPurchase', async () => {
    (iapService.purchasePackage as jest.Mock).mockResolvedValue(PURCHASE_RESULT);
    (subscriptionService.verifyPurchase as jest.Mock).mockResolvedValue(PREMIUM_ENTITLEMENT);
    const { result } = renderHook(() => usePurchase(), { wrapper: queryWrapper() });

    await act(async () => {
      result.current.mutate(mockMonthly);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(iapService.purchasePackage).toHaveBeenCalledWith(mockMonthly, SIGNED_IN_USER.id);
    expect(subscriptionService.verifyPurchase).toHaveBeenCalledWith(PURCHASE_RESULT);
  });

  it('invalidates the track contents, lesson, paths and user profile queries on success', async () => {
    (iapService.purchasePackage as jest.Mock).mockResolvedValue(PURCHASE_RESULT);
    (subscriptionService.verifyPurchase as jest.Mock).mockResolvedValue(PREMIUM_ENTITLEMENT);

    const queryClient = createTestQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => usePurchase(), { wrapper: queryWrapper(queryClient) });

    await act(async () => {
      result.current.mutate(mockMonthly);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: TRACK_CONTENTS_QUERY_KEY });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: LESSONS_QUERY_KEY });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: PATHS_QUERY_KEY });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: USER_PROFILE_QUERY_KEY });
  });

  it('exposes error when purchasePackage rejects', async () => {
    (iapService.purchasePackage as jest.Mock).mockRejectedValue(new Error('User cancelled'));
    const { result } = renderHook(() => usePurchase(), { wrapper: queryWrapper() });

    await act(async () => {
      result.current.mutate(mockMonthly);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(subscriptionService.verifyPurchase).not.toHaveBeenCalled();
  });

  it('exposes error when verifyPurchase rejects', async () => {
    (iapService.purchasePackage as jest.Mock).mockResolvedValue(PURCHASE_RESULT);
    (subscriptionService.verifyPurchase as jest.Mock).mockRejectedValue(new Error('Server error'));
    const { result } = renderHook(() => usePurchase(), { wrapper: queryWrapper() });

    await act(async () => {
      result.current.mutate(mockMonthly);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('stays pending until the invalidations settle', async () => {
    (iapService.purchasePackage as jest.Mock).mockResolvedValue(PURCHASE_RESULT);
    (subscriptionService.verifyPurchase as jest.Mock).mockResolvedValue(PREMIUM_ENTITLEMENT);

    const queryClient = createTestQueryClient();
    let settle: () => void = () => {};
    jest.spyOn(queryClient, 'invalidateQueries').mockReturnValue(
      new Promise<void>((resolve) => { settle = resolve; }),
    );
    const { result } = renderHook(() => usePurchase(), { wrapper: queryWrapper(queryClient) });

    await act(async () => {
      result.current.mutate(mockMonthly);
    });
    await waitFor(() => expect(subscriptionService.verifyPurchase).toHaveBeenCalled());
    expect(result.current.isSuccess).toBe(false);

    await act(async () => { settle(); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('exposes error when an invalidation rejects, so the paywall shows it', async () => {
    (iapService.purchasePackage as jest.Mock).mockResolvedValue(PURCHASE_RESULT);
    (subscriptionService.verifyPurchase as jest.Mock).mockResolvedValue(PREMIUM_ENTITLEMENT);

    const queryClient = createTestQueryClient();
    jest.spyOn(queryClient, 'invalidateQueries').mockRejectedValue(new Error('refetch failed'));
    const { result } = renderHook(() => usePurchase(), { wrapper: queryWrapper(queryClient) });

    await act(async () => {
      result.current.mutate(mockMonthly);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('refetch failed');
  });
});

// ── useRestorePurchases ───────────────────────────────────────────────────────

const RESTORE_VERIFY_BODY = { originalTransactionId: null, productId: '' };

describe('useRestorePurchases (073b-8)', () => {
  it('calls restorePurchases then verifyPurchase with null body', async () => {
    (iapService.restorePurchases as jest.Mock).mockResolvedValue(undefined);
    (subscriptionService.verifyPurchase as jest.Mock).mockResolvedValue(PREMIUM_ENTITLEMENT);
    const { result } = renderHook(() => useRestorePurchases(), { wrapper: queryWrapper() });

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(iapService.restorePurchases).toHaveBeenCalledWith(SIGNED_IN_USER.id);
    expect(subscriptionService.verifyPurchase).toHaveBeenCalledWith(RESTORE_VERIFY_BODY);
  });

  it('invalidates the track contents, lesson, paths and user profile queries on success', async () => {
    (iapService.restorePurchases as jest.Mock).mockResolvedValue(undefined);
    (subscriptionService.verifyPurchase as jest.Mock).mockResolvedValue(PREMIUM_ENTITLEMENT);

    const queryClient = createTestQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useRestorePurchases(), { wrapper: queryWrapper(queryClient) });

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: TRACK_CONTENTS_QUERY_KEY });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: LESSONS_QUERY_KEY });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: PATHS_QUERY_KEY });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: USER_PROFILE_QUERY_KEY });
  });

  it('exposes error and does not call verifyPurchase when restorePurchases rejects', async () => {
    (iapService.restorePurchases as jest.Mock).mockRejectedValue(new Error('Restore failed'));
    const { result } = renderHook(() => useRestorePurchases(), { wrapper: queryWrapper() });

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(subscriptionService.verifyPurchase).not.toHaveBeenCalled();
  });

  it('exposes error when an invalidation rejects, so the paywall shows it', async () => {
    (iapService.restorePurchases as jest.Mock).mockResolvedValue(undefined);
    (subscriptionService.verifyPurchase as jest.Mock).mockResolvedValue(PREMIUM_ENTITLEMENT);

    const queryClient = createTestQueryClient();
    jest.spyOn(queryClient, 'invalidateQueries').mockRejectedValue(new Error('refetch failed'));
    const { result } = renderHook(() => useRestorePurchases(), { wrapper: queryWrapper(queryClient) });

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('refetch failed');
  });
});

describe('payments with no signed-in user (132a)', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null });
  });

  it('a purchase fails before Apple is asked, and nothing is verified', async () => {
    const { result } = renderHook(() => usePurchase(), { wrapper: queryWrapper() });
    act(() => result.current.mutate(mockMonthly));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(iapService.purchasePackage).not.toHaveBeenCalled();
    expect(subscriptionService.verifyPurchase).not.toHaveBeenCalled();
  });

  it('a restore fails before Apple is asked, and nothing is verified', async () => {
    const { result } = renderHook(() => useRestorePurchases(), { wrapper: queryWrapper() });
    act(() => result.current.mutate());
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(iapService.restorePurchases).not.toHaveBeenCalled();
    expect(subscriptionService.verifyPurchase).not.toHaveBeenCalled();
  });
});

describe('payments with no signal (105g)', () => {
  beforeEach(() => {
    act(() => onlineManager.setOnline(false));
  });
  afterEach(() => act(() => onlineManager.setOnline(true)));

  it('a purchase sends nothing and fails at once with NoSignalError', async () => {
    const { result } = renderHook(() => usePurchase(), { wrapper: queryWrapper() });
    act(() => result.current.mutate(mockMonthly));
    await waitFor(() => expect(result.current.error).toEqual(new NoSignalError()));
    expect(iapService.purchasePackage).not.toHaveBeenCalled();
    expect(subscriptionService.verifyPurchase).not.toHaveBeenCalled();
  });

  it('a restore sends nothing and fails at once with NoSignalError', async () => {
    const { result } = renderHook(() => useRestorePurchases(), { wrapper: queryWrapper() });
    act(() => result.current.mutate());
    await waitFor(() => expect(result.current.error).toEqual(new NoSignalError()));
    expect(iapService.restorePurchases).not.toHaveBeenCalled();
    expect(subscriptionService.verifyPurchase).not.toHaveBeenCalled();
  });
});
