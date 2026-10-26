import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Sentry from '@sentry/react-native';
import type { NotificationPreference, UpdateNotificationPreferencesRequest } from '@learning/shared';
import { notificationService } from '@/services/notification.service';
import { NOTIFICATION_PREFERENCES_QUERY_KEY } from '@/lib/queryKeys';

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

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (prefs: UpdateNotificationPreferencesRequest) => notificationService.updatePreferences(prefs),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTIFICATION_PREFERENCES_QUERY_KEY }),
  });
}
