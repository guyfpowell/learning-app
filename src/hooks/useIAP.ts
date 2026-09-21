import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { PurchasesPackage } from 'react-native-purchases';
import { iapService } from '@/services/iap.service';
import { subscriptionService } from '@/services/subscription.service';

// Re-export the types the paywall screen and tests need so they only import from here.
export type { PurchasesPackage } from 'react-native-purchases';
export type { IAPOffering } from '@/services/iap.service';

/**
 * Fetches the current RevenueCat offering (monthly + annual packages).
 * Stale time is long — product prices change rarely and the paywall renders
 * immediately without waiting for a fresh network call.
 */
export function useOfferings() {
  return useQuery({
    queryKey: ['iap', 'offerings'],
    queryFn:  () => iapService.getOfferings(),
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

/**
 * Mutation to restore previous Apple purchases — required by App Review
 * (Chunk 8, 073b-8).
 *
 * Flow:
 *   1. `iapService.restorePurchases` calls `Purchases.restorePurchases()` to
 *      re-validate the Apple receipt with RevenueCat.
 *   2. `subscriptionService.verifyPurchase` with a null originalTransactionId
 *      skips any upsert on our server but re-fetches the resolved entitlement —
 *      which picks up any subscription row the RevenueCat webhook already wrote.
 *   3. Every entitlement-dependent query is invalidated.
 *
 * C1 (073b): entitlement resolved from our DB; RevenueCat never queried for it.
 */
export function useRestorePurchases() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await iapService.restorePurchases();
      // Pass null/empty so the server skips the upsert and just returns the
      // current resolved entitlement — graceful behaviour already tested in Chunk 7.
      return subscriptionService.verifyPurchase({ originalTransactionId: null, productId: '' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['track-contents'] });
      queryClient.invalidateQueries({ queryKey: ['lesson'] });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
  });
}

/**
 * Mutation to initiate an Apple payment sheet and synchronously verify
 * the purchase with our server — Chunk 7 (073b-7).
 *
 * Flow:
 *   1. `iapService.purchasePackage` opens the Apple payment sheet and waits.
 *   2. On success, `subscriptionService.verifyPurchase` writes the
 *      subscription row to our DB and returns the resolved EntitlementResult.
 *   3. Every entitlement-dependent query is invalidated so cached locked/
 *      unlocked states are refetched without requiring an app restart.
 *
 * C1 (073b): our DB is the entitlement authority.  RevenueCat is never
 * queried for the entitlement decision — `verifyPurchase` reads from our DB.
 */
export function usePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (pkg: PurchasesPackage) => {
      const purchaseResult = await iapService.purchasePackage(pkg);
      return subscriptionService.verifyPurchase(purchaseResult);
    },
    onSuccess: () => {
      // Invalidate every cache that reflects locked/unlocked lesson state or
      // subscription status so they are refetched with the new entitlement.
      queryClient.invalidateQueries({ queryKey: ['track-contents'] });
      queryClient.invalidateQueries({ queryKey: ['lesson'] });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
  });
}
