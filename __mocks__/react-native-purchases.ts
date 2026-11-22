/**
 * Jest mock for react-native-purchases (RevenueCat).
 * The native SDK cannot run in the test environment; this provides
 * enough of the API surface for the IAP service and hook tests.
 */
import type { PurchasesOfferings } from 'react-native-purchases';

const NO_OFFERINGS: PurchasesOfferings = { all: {}, current: null };

export enum PACKAGE_TYPE {
  MONTHLY  = 'MONTHLY',
  ANNUAL   = 'ANNUAL',
  LIFETIME = 'LIFETIME',
  CUSTOM   = 'CUSTOM',
  UNKNOWN  = 'UNKNOWN',
}

export enum PRODUCT_CATEGORY {
  NON_SUBSCRIPTION = 'NON_SUBSCRIPTION',
  SUBSCRIPTION     = 'SUBSCRIPTION',
  UNKNOWN          = 'UNKNOWN',
}

export enum PRODUCT_TYPE {
  CONSUMABLE                  = 'CONSUMABLE',
  NON_CONSUMABLE              = 'NON_CONSUMABLE',
  NON_RENEWABLE_SUBSCRIPTION  = 'NON_RENEWABLE_SUBSCRIPTION',
  AUTO_RENEWABLE_SUBSCRIPTION = 'AUTO_RENEWABLE_SUBSCRIPTION',
  PREPAID_SUBSCRIPTION        = 'PREPAID_SUBSCRIPTION',
  UNKNOWN                     = 'UNKNOWN',
}

const Purchases = {
  configure:        jest.fn(),
  logIn:            jest.fn(() => Promise.resolve({ customerInfo: {}, created: false })),
  // Defaults to an anonymous RevenueCat ID, as before `logIn` has finished.
  getAppUserID:     jest.fn(() => Promise.resolve('$RCAnonymousID:anon')),
  getOfferings:     jest.fn(() => Promise.resolve(NO_OFFERINGS)),
  // Returns productIdentifier and transaction.transactionIdentifier so
  // iapService.purchasePackage can extract the originalTransactionId (Chunk 7).
  purchasePackage:  jest.fn(() => Promise.resolve({
    customerInfo:        {},
    productIdentifier:   'com.ascentlearning.premium_monthly',
    transaction:         { transactionIdentifier: 'apple-txn-id-1' },
  })),
  // Restores previous purchases (App Review requirement — Chunk 8).
  restorePurchases: jest.fn(() => Promise.resolve({ customerInfo: {} })),
};

export default Purchases;
