import { useQuery } from '@tanstack/react-query';
import * as Sentry from '@sentry/react-native';
import type { NotificationPreference, UpdateNotificationPreferencesRequest } from '@learning/shared';
import { notificationService } from '@/services/notification.service';
import { NOTIFICATION_PREFERENCES_QUERY_KEY } from '@/lib/queryKeys';
import { UPDATE_PREFERENCES_WRITE } from '@/lib/safeWrites';
import { useSafeWrite } from '@/hooks/useSafeWrite';

export function useNotificationPreferences() {
  return useQuery({
    queryKey: NOTIFICATION_PREFERENCES_QUERY_KEY,
    queryFn: loadPreferences,
  });
}

/** The preferences fetch, logged on failure; callers show `NOTIFICATION_SETTINGS_LOAD_ERROR`. */
async function loadPreferences(): Promise<NotificationPreference> {
  try {
    return await notificationService.getPreferences();
  } catch (err) {
    Sentry.addBreadcrumb({ category: 'settings', message: 'Notification preferences load failed', level: 'warning', data: { err: String(err) } });
    throw err;
  }
}

/** Safe to send again (ADR-021 Decision 4): waits through a drop, one write at a time, survives a restart. */
export function useUpdateNotificationPreferences() {
  return useSafeWrite<UpdateNotificationPreferencesRequest, NotificationPreference>(UPDATE_PREFERENCES_WRITE);
}
