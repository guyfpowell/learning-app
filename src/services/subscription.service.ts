/**
 * subscription.service — Chunk 7 (073b-7)
 *
 * Calls the server's synchronous post-purchase verify endpoint so the
 * client can update its entitlement state without waiting for the RevenueCat
 * webhook.
 *
 * C1: our database is the entitlement authority.  The server writes the
 * subscription row and returns the resolved EntitlementResult; the client
 * never queries RevenueCat for entitlement decisions.
 */
import api from '@/lib/api';
import type { AppleVerifyRequest, EntitlementResult } from '@learning/shared';

export const subscriptionService = {
  /**
   * POST /subscriptions/apple/verify
   * Authenticated — sends JWT via the `api` interceptor.
   *
   * Writes the Apple subscription row on the server and returns the
   * caller's current EntitlementResult.  Call this immediately after
   * `iapService.purchasePackage` resolves.
   */
  async verifyPurchase(body: AppleVerifyRequest): Promise<EntitlementResult> {
    const { data } = await api.post<EntitlementResult>('/subscriptions/apple/verify', body);
    return data;
  },
};
