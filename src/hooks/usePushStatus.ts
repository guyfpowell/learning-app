import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import * as Sentry from '@sentry/react-native';
import { registerForPushNotifications } from './useNotifications';

type PermissionStatus = 'granted' | 'denied' | 'undetermined';

const STATUS_ERROR = 'Could not check notification settings.';
const REGISTER_ERROR = 'Could not enable notifications. Please try again.';

export function usePushStatus() {
  const queryClient = useQueryClient();
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('undetermined');
  const [error, setError] = useState<string | null>(null);

  // Never rejects: a failed check is logged and surfaced as `error`, not left as 'undetermined'.
  const checkStatus = useCallback(async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setPermissionStatus(status);
      setError(null);
    } catch (err) {
      Sentry.addBreadcrumb({ category: 'push', message: 'Push status check failed', level: 'warning', data: { err: String(err) } });
      setError(STATUS_ERROR);
    }
  }, []);

  useEffect(() => {
    void checkStatus();
  }, [checkStatus]);

  const register = useCallback(async () => {
    try {
      await registerForPushNotifications(queryClient);
    } catch (err) {
      Sentry.addBreadcrumb({ category: 'push', message: 'Push registration failed', level: 'warning', data: { err: String(err) } });
      setError(REGISTER_ERROR);
      return;
    }
    await checkStatus();
  }, [checkStatus, queryClient]);

  return { permissionStatus, register, error };
}
