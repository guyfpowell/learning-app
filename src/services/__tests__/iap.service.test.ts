import Purchases from 'react-native-purchases';
import type { PurchasesPackage, PurchasesOfferings } from 'react-native-purchases';
import { PACKAGE_TYPE } from 'react-native-purchases';
import { iapService } from '../iap.service';

// Minimal mock fixtures — cast to avoid typing every required field on the
// complex RevenueCat interfaces; the service only reads .monthly and .annual.
const mockMonthly = {
  packageType:        PACKAGE_TYPE.MONTHLY,
  offeringIdentifier: 'default',
  product: {
    identifier:  'com.learning.app.premium.monthly',
    title:       'Premium Monthly',
    description: 'Unlimited access, billed monthly.',
    price:       9.99,
    priceString: '£9.99',
  },
} as unknown as PurchasesPackage;

const mockAnnual = {
  packageType:        PACKAGE_TYPE.ANNUAL,
  offeringIdentifier: 'default',
  product: {
    identifier:  'com.learning.app.premium.annual',
    title:       'Premium Annual',
    description: 'Unlimited access, billed annually.',
    price:       79.99,
    priceString: '£79.99',
  },
} as unknown as PurchasesPackage;

const mockOfferings = {
  current: {
    identifier:        'default',
    monthly:           mockMonthly,
    annual:            mockAnnual,
    serverDescription: '',
    metadata:          {},
    availablePackages: [mockMonthly, mockAnnual],
    lifetime:          null,
    sixMonth:          null,
    threeMonth:        null,
    twoMonth:          null,
    weekly:            null,
  },
} as unknown as PurchasesOfferings;

beforeEach(() => {
  jest.clearAllMocks();
});

// ── configure ────────────────────────────────────────────────────────────────

describe('iapService.configure', () => {
  it('calls Purchases.configure with the provided API key', () => {
    iapService.configure('appl_test_key_123');
    expect(Purchases.configure).toHaveBeenCalledWith({ apiKey: 'appl_test_key_123' });
  });
});

// ── logIn ─────────────────────────────────────────────────────────────────────

describe('iapService.logIn', () => {
  it('calls Purchases.logIn with the userId', async () => {
    await iapService.logIn('user-abc');
    expect(Purchases.logIn).toHaveBeenCalledWith('user-abc');
  });
});

// ── getOfferings ──────────────────────────────────────────────────────────────

describe('iapService.getOfferings', () => {
  it('returns monthly and annual packages from the current offering', async () => {
    (Purchases.getOfferings as jest.Mock).mockResolvedValue(mockOfferings);
    const result = await iapService.getOfferings();
    expect(result.monthly).toBe(mockMonthly);
    expect(result.annual).toBe(mockAnnual);
  });

  it('returns nulls when there is no current offering', async () => {
    (Purchases.getOfferings as jest.Mock).mockResolvedValue({ current: null });
    const result = await iapService.getOfferings();
    expect(result.monthly).toBeNull();
    expect(result.annual).toBeNull();
  });

  it('returns nulls for missing package types within a current offering', async () => {
    (Purchases.getOfferings as jest.Mock).mockResolvedValue({
      current: { identifier: 'default', monthly: null, annual: null },
    });
    const result = await iapService.getOfferings();
    expect(result.monthly).toBeNull();
    expect(result.annual).toBeNull();
  });
});

// ── native module unavailable (Expo Go / OTA onto a build without the SDK) ───

describe('iapService when the native SDK is unavailable', () => {
  function loadWithMissingSdk() {
    let svc: typeof iapService | undefined;
    jest.isolateModules(() => {
      jest.doMock('react-native-purchases', () => {
        throw new Error('native module RNPurchases missing');
      });
      svc = require('../iap.service').iapService;
    });
    return svc!;
  }

  // The SDK is required at call time, so the throwing mock must stay registered
  // until each test ends.
  afterEach(() => {
    jest.dontMock('react-native-purchases');
  });

  it('loading the service does not throw', () => {
    expect(() => loadWithMissingSdk()).not.toThrow();
  });

  it('configure and logIn are silent no-ops', async () => {
    const svc = loadWithMissingSdk();
    expect(() => svc.configure('key')).not.toThrow();
    await expect(svc.logIn('user-1')).resolves.toBeUndefined();
  });

  it('getOfferings returns nulls', async () => {
    const svc = loadWithMissingSdk();
    await expect(svc.getOfferings()).resolves.toEqual({ monthly: null, annual: null });
  });

  it('purchasePackage rejects with a clear error', async () => {
    const svc = loadWithMissingSdk();
    await expect(svc.purchasePackage(mockMonthly)).rejects.toThrow(/not available/i);
  });

  it('configure does not throw when the SDK call itself throws', () => {
    (Purchases.configure as jest.Mock).mockImplementationOnce(() => { throw new Error('native missing'); });
    expect(() => iapService.configure('key')).not.toThrow();
  });

  it('restorePurchases rejects with a clear error', async () => {
    const svc = loadWithMissingSdk();
    await expect(svc.restorePurchases()).rejects.toThrow(/not available/i);
  });
});

// ── restorePurchases ──────────────────────────────────────────────────────────

describe('iapService.restorePurchases', () => {
  it('delegates to Purchases.restorePurchases', async () => {
    await iapService.restorePurchases();
    expect(Purchases.restorePurchases).toHaveBeenCalled();
  });

  it('propagates errors from Purchases.restorePurchases', async () => {
    const err = new Error('Restore failed');
    (Purchases.restorePurchases as jest.Mock).mockRejectedValueOnce(err);
    await expect(iapService.restorePurchases()).rejects.toThrow('Restore failed');
  });
});

// ── purchasePackage ───────────────────────────────────────────────────────────

describe('iapService.purchasePackage', () => {
  it('delegates to Purchases.purchasePackage', async () => {
    (Purchases.purchasePackage as jest.Mock).mockResolvedValue({
      customerInfo: {},
      productIdentifier: 'com.ascentlearning.premium_monthly',
      transaction: { transactionIdentifier: 'apple-txn-id-1' },
    });
    await iapService.purchasePackage(mockMonthly);
    expect(Purchases.purchasePackage).toHaveBeenCalledWith(mockMonthly);
  });

  it('returns originalTransactionId from transaction.transactionIdentifier', async () => {
    (Purchases.purchasePackage as jest.Mock).mockResolvedValue({
      customerInfo: {},
      productIdentifier: 'com.ascentlearning.premium_monthly',
      transaction: { transactionIdentifier: 'apple-txn-id-1' },
    });
    const result = await iapService.purchasePackage(mockMonthly);
    expect(result.originalTransactionId).toBe('apple-txn-id-1');
  });

  it('returns productId from result productIdentifier', async () => {
    (Purchases.purchasePackage as jest.Mock).mockResolvedValue({
      customerInfo: {},
      productIdentifier: 'com.ascentlearning.premium_annual',
      transaction: { transactionIdentifier: 'apple-txn-id-2' },
    });
    const result = await iapService.purchasePackage(mockAnnual);
    expect(result.productId).toBe('com.ascentlearning.premium_annual');
  });

  it('falls back to package product identifier when result has no productIdentifier', async () => {
    (Purchases.purchasePackage as jest.Mock).mockResolvedValue({
      customerInfo: {},
      transaction: { transactionIdentifier: 'apple-txn-id-1' },
      // productIdentifier intentionally absent to exercise the fallback
    });
    // Build a fixture that conforms to the real SDK type (identifier field)
    const pkg = {
      packageType:        PACKAGE_TYPE.MONTHLY,
      offeringIdentifier: 'default',
      product: { identifier: 'com.ascentlearning.fallback.monthly', title: '', description: '', price: 0, priceString: '' },
    } as unknown as PurchasesPackage;
    const result = await iapService.purchasePackage(pkg);
    expect(result.productId).toBe('com.ascentlearning.fallback.monthly');
  });

  it('returns null originalTransactionId when transaction is missing', async () => {
    (Purchases.purchasePackage as jest.Mock).mockResolvedValue({
      customerInfo: {},
      productIdentifier: 'com.ascentlearning.premium_monthly',
    });
    const result = await iapService.purchasePackage(mockMonthly);
    expect(result.originalTransactionId).toBeNull();
  });

  it('propagates errors from Purchases.purchasePackage', async () => {
    const err = new Error('Payment cancelled');
    (Purchases.purchasePackage as jest.Mock).mockRejectedValue(err);
    await expect(iapService.purchasePackage(mockMonthly)).rejects.toThrow('Payment cancelled');
  });
});
