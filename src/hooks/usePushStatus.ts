import { useCallback, useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { registerForPushNotifications } from './useNotifications';

type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export function usePushStatus() {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('undetermined');

  const checkStatus = useCallback(async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionStatus(status as PermissionStatus);
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const register = useCallback(async () => {
    await registerForPushNotifications();
    await checkStatus();
  }, [checkStatus]);

  return { permissionStatus, register };
}
