import { useEffect, useRef } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';
import type { RegisterPushTokenRequest } from '@learning/shared';
import { PUSH_TOKEN_WRITE, runSafeWrite } from '@/lib/safeWrites';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Requests push notification permissions on first mount, obtains the
 * Expo push token, and registers it with the backend.
 *
 * Must be called once from a component that is rendered when the user is
 * authenticated (e.g. the tabs layout).
 */
export function useNotifications() {
  const queryClient = useQueryClient();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // Background registration has no screen to report to: log, and never block app load.
    registerForPushNotifications(queryClient).catch((err) => {
      Sentry.addBreadcrumb({ category: 'push', message: 'Push registration failed', level: 'warning', data: { err: String(err) } });
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [queryClient]);
}

/** Sends the token as a write that is safe to send again (ADR-021 Decision 4): it waits through a drop and survives a restart. */
export function sendPushToken(client: QueryClient, token: string): Promise<unknown> {
  const body: RegisterPushTokenRequest = { token, platform: 'expo' };
  return runSafeWrite(client, PUSH_TOKEN_WRITE, body);
}

export async function registerForPushNotifications(client: QueryClient): Promise<void> {
  if (!Device.isDevice) {
    // Push tokens are not available in simulator — skip silently
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Daily reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  try {
    const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    await sendPushToken(client, tokenData.data);
  } catch (err) {
    // Non-blocking — do not prevent app load
    Sentry.addBreadcrumb({ category: 'push', message: 'Push token registration failed', level: 'warning', data: { err: String(err) } });
  }
}
