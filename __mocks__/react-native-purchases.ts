/**
 * Jest mock for react-native-purchases (RevenueCat).
 * The native SDK cannot run in the test environment; this provides
 * enough of the API surface for the IAP service and hook tests.
 */

export enum PACKAGE_TYPE {
  MONTHLY  = 'MONTHLY',
  ANNUAL   = 'ANNUAL',
  LIFETIME = 'LIFETIME',
  CUSTOM   = 'CUSTOM',
  UNKNOWN  = 'UNKNOWN',
}

export interface PurchasesStoreProduct {
  /** Matches the real RevenueCat SDK field name (not 'productIdentifier'). */
  identifier:        string;
  title:             string;
  description:       string;
  price:             number;
  priceString:       string;
  subscriptionPeriod?: string | null;
}

export interface PurchasesPackage {
  packageType:          PACKAGE_TYPE;
  offeringIdentifier:   string;
  product:              PurchasesStoreProduct;
}

export interface PurchasesOffering {
  identifier: string;
  monthly:    PurchasesPackage | null;
  annual:     PurchasesPackage | null;
}

export interface PurchasesOfferings {
  current: PurchasesOffering | null;
}

const Purchases = {
  configure:        jest.fn(),
  logIn:            jest.fn(() => Promise.resolve({ customerInfo: {}, created: false })),
  getOfferings:     jest.fn(() => Promise.resolve({ current: null } as PurchasesOfferings)),
  // Returns productIdentifier and transaction.transactionIdentifier so
  // iapService.purchasePackage can extract the originalTransactionId (Chunk 7).
  purchasePackage:  jest.fn(() => Promise.resolve({
    customerInfo:        {},
    productIdentifier:   'com.ascentlearning.premium_monthly',
    transaction:         { transactionIdentifier: 'apple-txn-id-1' },
  })),
};

export default Purchases;
