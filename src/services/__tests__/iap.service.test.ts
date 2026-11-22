import * as Sentry from '@sentry/react-native';
import Purchases from 'react-native-purchases';
import { PACKAGE_TYPE } from 'react-native-purchases';
import { BREADCRUMB_CATEGORY } from '@/lib/breadcrumbs';
import { must } from '@/test-utils/must';
import { makeOffering, makeOfferings, makePackage } from '@/test-utils/purchases';
import { iapService } from '../iap.service';

const mockMonthly = makePackage(PACKAGE_TYPE.MONTHLY, {
  identifier:  'com.learning.app.premium.monthly',
  title:       'Premium Monthly',
  description: 'Unlimited access, billed monthly.',
  price:       9.99,
  priceString: '£9.99',
});

const mockAnnual = makePackage(PACKAGE_TYPE.ANNUAL, {
  identifier:  'com.learning.app.premium.annual',
  title:       'Premium Annual',
  description: 'Unlimited access, billed annually.',
  price:       79.99,
  priceString: '£79.99',
});

const mockOfferings = makeOfferings(makeOffering(mockMonthly, mockAnnual));

const USER_ID = 'user-abc';
const ANONYMOUS_ID = '$RCAnonymousID:anon';

// RevenueCat's app user ID as the SDK holds it; `logIn` changes it, as the real one does.
const revenueCat = { appUserId: USER_ID };

beforeEach(() => {
  jest.clearAllMocks();
  revenueCat.appUserId = USER_ID;
  (Purchases.getAppUserID as jest.Mock).mockImplementation(() => Promise.resolve(revenueCat.appUserId));
  (Purchases.logIn as jest.Mock).mockImplementation((id: string) => {
    revenueCat.appUserId = id;
    return Promise.resolve({ customerInfo: {}, created: false });
  });
});

// The setups below replace a mock's behaviour for one test; put the manual mock's defaults back.
afterEach(() => {
  (Purchases.configure as jest.Mock).mockReset();
  (Purchases.restorePurchases as jest.Mock).mockImplementation(() => Promise.resolve({ customerInfo: {} }));
});

// ── configure ────────────────────────────────────────────────────────────────

describe('iapService.configure', () => {
  it('calls Purchases.configure with the provided API key', () => {
    iapService.configure('appl_test_key_123');
    expect(Purchases.configure).toHaveBeenCalledWith({ apiKey: 'appl_test_key_123' });
  });

  it('logs and does not throw when the SDK call itself throws', () => {
    (Purchases.configure as jest.Mock).mockImplementation(() => { throw new Error('native missing'); });
    expect(() => iapService.configure('key')).not.toThrow();
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
      category: BREADCRUMB_CATEGORY.iap,
      message:  'RevenueCat configure failed',
      level:    'warning',
      data:     { err: 'Error: native missing' },
    });
  });
});

// ── logIn ─────────────────────────────────────────────────────────────────────

describe('iapService.logIn', () => {
  it('calls Purchases.logIn with the userId', async () => {
    await iapService.logIn(USER_ID);
    expect(Purchases.logIn).toHaveBeenCalledWith(USER_ID);
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
    return must(svc, 'iapService loaded under the missing SDK');
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

  it('logs that the SDK is unavailable', async () => {
    const svc = loadWithMissingSdk();
    await svc.getOfferings();
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
      category: BREADCRUMB_CATEGORY.iap,
      message:  'RevenueCat SDK unavailable',
      level:    'warning',
      data:     { err: 'Error: native module RNPurchases missing' },
    });
  });

  it('getOfferings returns nulls', async () => {
    const svc = loadWithMissingSdk();
    await expect(svc.getOfferings()).resolves.toEqual({ monthly: null, annual: null });
  });

  it('purchasePackage rejects with a clear error', async () => {
    const svc = loadWithMissingSdk();
    await expect(svc.purchasePackage(mockMonthly, USER_ID)).rejects.toThrow(/not available/i);
  });

  it('restorePurchases rejects with a clear error', async () => {
    const svc = loadWithMissingSdk();
    await expect(svc.restorePurchases(USER_ID)).rejects.toThrow(/not available/i);
  });
});

// ── restorePurchases ──────────────────────────────────────────────────────────

describe('iapService.restorePurchases', () => {
  it('delegates to Purchases.restorePurchases', async () => {
    await iapService.restorePurchases(USER_ID);
    expect(Purchases.restorePurchases).toHaveBeenCalled();
  });

  it('propagates errors from Purchases.restorePurchases', async () => {
    const err = new Error('Restore failed');
    (Purchases.restorePurchases as jest.Mock).mockRejectedValue(err);
    await expect(iapService.restorePurchases(USER_ID)).rejects.toThrow('Restore failed');
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
    await iapService.purchasePackage(mockMonthly, USER_ID);
    expect(Purchases.purchasePackage).toHaveBeenCalledWith(mockMonthly);
  });

  it('returns originalTransactionId from transaction.transactionIdentifier', async () => {
    (Purchases.purchasePackage as jest.Mock).mockResolvedValue({
      customerInfo: {},
      productIdentifier: 'com.ascentlearning.premium_monthly',
      transaction: { transactionIdentifier: 'apple-txn-id-1' },
    });
    const result = await iapService.purchasePackage(mockMonthly, USER_ID);
    expect(result.originalTransactionId).toBe('apple-txn-id-1');
  });

  it('returns productId from result productIdentifier', async () => {
    (Purchases.purchasePackage as jest.Mock).mockResolvedValue({
      customerInfo: {},
      productIdentifier: 'com.ascentlearning.premium_annual',
      transaction: { transactionIdentifier: 'apple-txn-id-2' },
    });
    const result = await iapService.purchasePackage(mockAnnual, USER_ID);
    expect(result.productId).toBe('com.ascentlearning.premium_annual');
  });

  it('falls back to package product identifier when result has no productIdentifier', async () => {
    (Purchases.purchasePackage as jest.Mock).mockResolvedValue({
      customerInfo: {},
      transaction: { transactionIdentifier: 'apple-txn-id-1' },
      // productIdentifier intentionally absent to exercise the fallback
    });
    const pkg = makePackage(PACKAGE_TYPE.MONTHLY, { identifier: 'com.ascentlearning.fallback.monthly' });
    const result = await iapService.purchasePackage(pkg, USER_ID);
    expect(result.productId).toBe('com.ascentlearning.fallback.monthly');
  });

  it('returns null originalTransactionId when transaction is missing', async () => {
    (Purchases.purchasePackage as jest.Mock).mockResolvedValue({
      customerInfo: {},
      productIdentifier: 'com.ascentlearning.premium_monthly',
    });
    const result = await iapService.purchasePackage(mockMonthly, USER_ID);
    expect(result.originalTransactionId).toBeNull();
  });

  it('propagates errors from Purchases.purchasePackage', async () => {
    const err = new Error('Payment cancelled');
    (Purchases.purchasePackage as jest.Mock).mockRejectedValue(err);
    await expect(iapService.purchasePackage(mockMonthly, USER_ID)).rejects.toThrow('Payment cancelled');
  });
});

// ── login before purchase and restore (132a) ──────────────────────────────────

describe('RevenueCat is logged in as the user before Apple is asked anything (132a)', () => {
  // What `Purchases.purchasePackage` / `restorePurchases` saw as the app user ID when they were called.
  const idSeenBySheet: { id: string | null } = { id: null };
  const idSeenByRestore: { id: string | null } = { id: null };

  beforeEach(() => {
    idSeenBySheet.id = null;
    idSeenByRestore.id = null;
    (Purchases.purchasePackage as jest.Mock).mockImplementation(() => {
      idSeenBySheet.id = revenueCat.appUserId;
      return Promise.resolve({ customerInfo: {}, productIdentifier: 'p', transaction: { transactionIdentifier: 't' } });
    });
    (Purchases.restorePurchases as jest.Mock).mockImplementation(() => {
      idSeenByRestore.id = revenueCat.appUserId;
      return Promise.resolve({ customerInfo: {} });
    });
  });

  it.each([
    ['anonymous', ANONYMOUS_ID],
    ["another user's", 'user-other'],
  ])('purchase logs in as the user first when the ID is %s', async (_label, current) => {
    revenueCat.appUserId = current;
    await iapService.purchasePackage(mockMonthly, USER_ID);
    expect(Purchases.logIn).toHaveBeenCalledWith(USER_ID);
    expect(idSeenBySheet.id).toBe(USER_ID);
  });

  it.each([
    ['anonymous', ANONYMOUS_ID],
    ["another user's", 'user-other'],
  ])('restore logs in as the user first when the ID is %s', async (_label, current) => {
    revenueCat.appUserId = current;
    await iapService.restorePurchases(USER_ID);
    expect(Purchases.logIn).toHaveBeenCalledWith(USER_ID);
    expect(idSeenByRestore.id).toBe(USER_ID);
  });

  it('purchase does not log in again when the ID already matches', async () => {
    await iapService.purchasePackage(mockMonthly, USER_ID);
    expect(Purchases.logIn).not.toHaveBeenCalled();
    expect(Purchases.purchasePackage).toHaveBeenCalledWith(mockMonthly);
  });

  it('restore does not log in again when the ID already matches', async () => {
    await iapService.restorePurchases(USER_ID);
    expect(Purchases.logIn).not.toHaveBeenCalled();
    expect(Purchases.restorePurchases).toHaveBeenCalled();
  });

  it('a failed login stops the purchase before Apple is asked', async () => {
    revenueCat.appUserId = ANONYMOUS_ID;
    (Purchases.logIn as jest.Mock).mockRejectedValue(new Error('login failed'));
    await expect(iapService.purchasePackage(mockMonthly, USER_ID)).rejects.toThrow('login failed');
    expect(Purchases.purchasePackage).not.toHaveBeenCalled();
  });

  it('a failed login stops the restore before Apple is asked', async () => {
    revenueCat.appUserId = ANONYMOUS_ID;
    (Purchases.logIn as jest.Mock).mockRejectedValue(new Error('login failed'));
    await expect(iapService.restorePurchases(USER_ID)).rejects.toThrow('login failed');
    expect(Purchases.restorePurchases).not.toHaveBeenCalled();
  });

  it('a failure to read the current ID stops the purchase before Apple is asked', async () => {
    (Purchases.getAppUserID as jest.Mock).mockRejectedValue(new Error('not configured'));
    await expect(iapService.purchasePackage(mockMonthly, USER_ID)).rejects.toThrow('not configured');
    expect(Purchases.purchasePackage).not.toHaveBeenCalled();
  });
});
