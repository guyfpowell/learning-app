/**
 * Thin wrapper around the RevenueCat SDK (react-native-purchases).
 *
 * Constraint C1 (073b): our database is the entitlement authority — never
 * RevenueCat.  This service is only used to:
 *   1. Configure the SDK and identify the logged-in user.
 *   2. Fetch product pricing to display in the paywall.
 *   3. Initiate the Apple payment sheet.
 *   4. Restore previous purchases.
 *
 * `Purchases.getCustomerInfo()` is deliberately not called; entitlement
 * decisions always come from our own server via EntitlementService.
 */
import type PurchasesType from 'react-native-purchases';
import type { PurchasesPackage } from 'react-native-purchases';
import { BREADCRUMB_CATEGORY, warnBreadcrumb } from '@/lib/breadcrumbs';

/**
 * The SDK is native code. Builds and OTA targets that predate it (Expo Go, the
 * installed preview build) cannot load it, so it is required lazily: when it
 * is missing the app runs normally and purchasing is simply unavailable.
 */
function loadPurchases(): typeof PurchasesType | null {
  try {
    return require('react-native-purchases').default as typeof PurchasesType;
  } catch (err) {
    warnBreadcrumb(BREADCRUMB_CATEGORY.iap, 'RevenueCat SDK unavailable', err);
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
  } catch (err) {
    // Purchasing stays disabled; the app runs on without it.
    warnBreadcrumb(BREADCRUMB_CATEGORY.iap, 'RevenueCat configure failed', err);
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
 * Make sure RevenueCat's app user ID is `userId` before Apple is asked anything
 * (132a). A purchase made under an anonymous ID would leave a paying user
 * without premium, because the server confirms purchases by app user ID.
 * Rejects when the ID can't be read or the login fails, so the caller stops.
 * Reads only the ID, never customer info (C1).
 */
async function ensureLoggedInAs(Purchases: typeof PurchasesType, userId: string): Promise<void> {
  if ((await Purchases.getAppUserID()) === userId) return;
  await Purchases.logIn(userId);
}

/** The SDK, logged in as `userId`, for a payment step. Throws when the native SDK is unavailable. */
async function purchasesLoggedInAs(userId: string): Promise<typeof PurchasesType> {
  const Purchases = loadPurchases();
  if (!Purchases) throw new Error('Purchases are not available in this build');
  await ensureLoggedInAs(Purchases, userId);
  return Purchases;
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
 * Initiate the Apple payment sheet for the given package, once RevenueCat is
 * logged in as `userId` (132a).
 * Throws when the user cancels or the transaction fails (RevenueCat SDK
 * throws with `userCancelled: true` on cancellation — callers should check).
 *
 * Returns a `PurchaseResult` with the transaction identifier and product id so
 * the caller can immediately verify with our server (Chunk 7).  Call
 * `subscriptionService.verifyPurchase(result)` right after this resolves.
 */
async function purchasePackage(pkg: PurchasesPackage, userId: string): Promise<PurchaseResult> {
  const Purchases = await purchasesLoggedInAs(userId);
  // The RevenueCat SDK validates the Apple receipt before returning.
  const raw = await Purchases.purchasePackage(pkg);
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
 * Logs RevenueCat in as `userId` first, like `purchasePackage` (132a).
 * Throws when the native SDK is unavailable (same contract as `purchasePackage`).
 */
async function restorePurchases(userId: string): Promise<void> {
  const Purchases = await purchasesLoggedInAs(userId);
  await Purchases.restorePurchases();
}

export const iapService = { configure, logIn, getOfferings, purchasePackage, restorePurchases };
