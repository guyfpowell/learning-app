import { Linking } from 'react-native';
import * as Sentry from '@sentry/react-native';

/** Where every locked action sends the user to upgrade. */
export const PAYWALL_ROUTE = '/(tabs)/paywall';

/** Opens the iOS manage-subscriptions sheet. */
export const MANAGE_SUBSCRIPTIONS_URL = 'itms-apps://apps.apple.com/account/subscriptions';

export function openManageSubscriptions(): void {
  Linking.openURL(MANAGE_SUBSCRIPTIONS_URL).catch((err) => {
    Sentry.addBreadcrumb({
      category: 'subscription',
      message: 'Could not open manage-subscriptions sheet',
      level: 'warning',
      data: { err: String(err) },
    });
  });
}
