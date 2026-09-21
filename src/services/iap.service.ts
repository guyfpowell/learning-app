/**
 * Thin wrapper around the RevenueCat SDK (react-native-purchases).
 *
 * Constraint C1 (073b): our database is the entitlement authority — never
 * RevenueCat.  This service is only used to:
 *   1. Configure the SDK and identify the logged-in user.
 *   2. Fetch product pricing to display in the paywall.
 *   3. Initiate the Apple payment sheet.
 *
 * `Purchases.getCustomerInfo()` is deliberately not called; entitlement
 * decisions always come from our own server via EntitlementService.
 */
import type PurchasesType from 'react-native-purchases';
import type { PurchasesPackage } from 'react-native-purchases';

/**
 * The SDK is native code. Builds and OTA targets that predate it (Expo Go, the
 * installed preview build) cannot load it, so it is required lazily: when it
 * is missing the app runs normally and purchasing is simply unavailable.
 */
function loadPurchases(): typeof PurchasesType | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-purchases').default as typeof PurchasesType;
  } catch {
    return null;
  }
}

/**
 * The result returned by `iapService.purchasePackage` after a successful
 * Apple purchase.  The caller passes this straight to
 * `subscriptionService.verifyPurchase` (Chunk 7).
 */
export interface PurchaseResult {
  /**
   * Apple's transaction identifier for this purchase.
   * For a first purchase, this equals the originalTransactionId.
   * Null if the SDK result did not include transaction data.
   */
  originalTransactionId: string | null;
  /** App Store product identifier (e.g. "com.ascentlearning.premium_monthly"). */
  productId: string;
}

export interface IAPOffering {
  monthly: PurchasesPackage | null;
  annual:  PurchasesPackage | null;
}

/**
 * Configure the RevenueCat SDK with the iOS public API key.
 * Must be called once before any other IAP calls — use the `useIAPInit` hook
 * inside the authenticated shell to ensure this runs after login.
 */
function configure(apiKey: string): void {
  try {
    loadPurchases()?.configure({ apiKey });
  } catch {
    // Native SDK unavailable in this build — purchasing is disabled.
  }
}

/**
 * Associate the current user with RevenueCat so purchase history is linked.
 * Called after `configure`, once the user's ID is known.
 */
async function logIn(userId: string): Promise<void> {
  await loadPurchases()?.logIn(userId);
}

/**
 * Fetch the current offering from RevenueCat and return the monthly and
 * annual packages.  Returns nulls when the SDK has no current offering
 * (e.g. network error on first launch, or not configured on Android yet).
 */
async function getOfferings(): Promise<IAPOffering> {
  const Purchases = loadPurchases();
  if (!Purchases) return { monthly: null, annual: null };
  const offerings = await Purchases.getOfferings();
  return {
    monthly: offerings.current?.monthly ?? null,
    annual:  offerings.current?.annual  ?? null,
  };
}

/**
 * Initiate the Apple payment sheet for the given package.
 * Throws when the user cancels or the transaction fails (RevenueCat SDK
 * throws with `userCancelled: true` on cancellation — callers should check).
 *
 * Returns a `PurchaseResult` with the transaction identifier and product id so
 * the caller can immediately verify with our server (Chunk 7).  Call
 * `subscriptionService.verifyPurchase(result)` right after this resolves.
 */
async function purchasePackage(pkg: PurchasesPackage): Promise<PurchaseResult> {
  // The RevenueCat SDK validates the Apple receipt before returning.
  // We cast to any because the TypeScript typings vary across SDK versions;
  // the fields we read (transaction.transactionIdentifier, productIdentifier)
  // are stable in react-native-purchases v8.x.
  const Purchases = loadPurchases();
  if (!Purchases) throw new Error('Purchases are not available in this build');
  const raw = await Purchases.purchasePackage(pkg) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  return {
    originalTransactionId: raw?.transaction?.transactionIdentifier ?? null,
    productId:             raw?.productIdentifier ?? pkg.product.identifier,
  };
}

/**
 * Restore previous purchases — required by App Review (Chunk 8, 073b).
 *
 * Calls `Purchases.restorePurchases()` which re-validates the user's Apple
 * receipt with RevenueCat.  The caller should then call
 * `subscriptionService.verifyPurchase({ originalTransactionId: null, productId: '' })`
 * to re-fetch the resolved entitlement from our own server (C1).
 *
 * Throws when the native SDK is unavailable (same contract as `purchasePackage`).
 */
async function restorePurchases(): Promise<void> {
  const Purchases = loadPurchases();
  if (!Purchases) throw new Error('Purchases are not available in this build');
  await Purchases.restorePurchases();
}

export const iapService = { configure, logIn, getOfferings, purchasePackage, restorePurchases };
