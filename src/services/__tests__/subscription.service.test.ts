/**
 * subscription.service tests — Chunk 7 (073b-7)
 *
 * verifyPurchase calls POST /subscriptions/apple/verify and returns the
 * resolved EntitlementResult so the client can invalidate its cache without
 * waiting for the RevenueCat webhook.
 */

import api from '@/lib/api';
import { subscriptionService } from '../subscription.service';
import type { EntitlementResult } from '@learning/shared';

jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

const PREMIUM_ENTITLEMENT: EntitlementResult = {
  tier:            'premium',
  source:          'subscription',
  expiresAt:       null,
  remainingBudget: 3,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('subscriptionService.verifyPurchase', () => {
  it('calls POST /subscriptions/apple/verify with the supplied body', async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: PREMIUM_ENTITLEMENT });

    await subscriptionService.verifyPurchase({
      originalTransactionId: 'apple-txn-id-1',
      productId:             'com.ascentlearning.premium_monthly',
    });

    expect(api.post).toHaveBeenCalledWith(
      '/subscriptions/apple/verify',
      { originalTransactionId: 'apple-txn-id-1', productId: 'com.ascentlearning.premium_monthly' }
    );
  });

  it('returns the EntitlementResult from the server response', async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: PREMIUM_ENTITLEMENT });

    const result = await subscriptionService.verifyPurchase({
      originalTransactionId: 'apple-txn-id-1',
      productId:             'com.ascentlearning.premium_monthly',
    });

    expect(result).toEqual(PREMIUM_ENTITLEMENT);
  });

  it('works when originalTransactionId is null', async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: PREMIUM_ENTITLEMENT });

    await subscriptionService.verifyPurchase({
      originalTransactionId: null,
      productId:             'com.ascentlearning.premium_monthly',
    });

    expect(api.post).toHaveBeenCalledWith(
      '/subscriptions/apple/verify',
      { originalTransactionId: null, productId: 'com.ascentlearning.premium_monthly' }
    );
  });

  it('propagates errors from the API call', async () => {
    const err = new Error('Network error');
    (api.post as jest.Mock).mockRejectedValue(err);

    await expect(
      subscriptionService.verifyPurchase({
        originalTransactionId: 'apple-txn-id-1',
        productId:             'com.ascentlearning.premium_monthly',
      })
    ).rejects.toThrow('Network error');
  });
});
