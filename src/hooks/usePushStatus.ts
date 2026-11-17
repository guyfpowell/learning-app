import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { BREADCRUMB_CATEGORY, warnBreadcrumb } from '@/lib/breadcrumbs';
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
      warnBreadcrumb(BREADCRUMB_CATEGORY.push, 'Push status check failed', err);
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
      warnBreadcrumb(BREADCRUMB_CATEGORY.push, 'Push registration failed', err);
      setError(REGISTER_ERROR);
      return;
    }
    await checkStatus();
  }, [checkStatus, queryClient]);

  return { permissionStatus, register, error };
}
