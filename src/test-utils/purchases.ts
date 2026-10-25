import { PACKAGE_TYPE, PRODUCT_CATEGORY, PRODUCT_TYPE } from 'react-native-purchases';
import type {
  PurchasesOffering,
  PurchasesOfferings,
  PurchasesPackage,
  PurchasesStoreProduct,
} from 'react-native-purchases';

const OFFERING_ID = 'default';

/** A complete RevenueCat package; `product` overrides are merged over the default product. */
export function makePackage(
  packageType: PACKAGE_TYPE,
  product: Partial<PurchasesStoreProduct> = {},
): PurchasesPackage {
  const identifier = product.identifier ?? 'com.learning.app.premium';
  return {
    identifier:         `$rc_${packageType.toLowerCase()}`,
    packageType,
    offeringIdentifier: OFFERING_ID,
    presentedOfferingContext: {
      offeringIdentifier:  OFFERING_ID,
      placementIdentifier: null,
      targetingContext:    null,
    },
    product: {
      identifier,
      title:                       '',
      description:                 '',
      price:                       0,
      priceString:                 '',
      pricePerWeek:                null,
      pricePerMonth:               null,
      pricePerYear:                null,
      pricePerWeekString:          null,
      pricePerMonthString:         null,
      pricePerYearString:          null,
      currencyCode:                'GBP',
      introPrice:                  null,
      discounts:                   null,
      productCategory:             PRODUCT_CATEGORY.SUBSCRIPTION,
      productType:                 PRODUCT_TYPE.AUTO_RENEWABLE_SUBSCRIPTION,
      subscriptionPeriod:          null,
      defaultOption:               null,
      subscriptionOptions:         null,
      presentedOfferingIdentifier: OFFERING_ID,
      presentedOfferingContext:    null,
      ...product,
    },
  };
}

/** A complete RevenueCat offering holding only the given monthly and annual packages. */
export function makeOffering(monthly: PurchasesPackage | null, annual: PurchasesPackage | null): PurchasesOffering {
  return {
    identifier:        OFFERING_ID,
    serverDescription: '',
    metadata:          {},
    availablePackages: [monthly, annual].filter((p): p is PurchasesPackage => p !== null),
    lifetime:          null,
    annual,
    sixMonth:          null,
    threeMonth:        null,
    twoMonth:          null,
    monthly,
    weekly:            null,
  };
}

export function makeOfferings(current: PurchasesOffering | null): PurchasesOfferings {
  return { all: current ? { [current.identifier]: current } : {}, current };
}
