import { useEffect, useEffectEvent } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { BREADCRUMB_CATEGORY, warnBreadcrumb } from '@/lib/breadcrumbs';
import { PUSH_SCREEN, isWeeklyRecapPush, trackBuildPushDataOf, type RegisterPushTokenRequest } from '@learning/shared';
import { PUSH_TOKEN_WRITE, runSafeWrite } from '@/lib/safeWrites';
import { invalidateBuildQueries } from '@/lib/buildInvalidation';
import { HOME_ROUTE, PROGRESS_ROUTE, WEEK_ROUTE, buildRoute } from '@/lib/routes';
import { isShownBuild } from '@/lib/shownBuild';

/** The build a push is about, or null for any other push. */
function buildIdOf(notification: Notifications.Notification): string | null {
  return trackBuildPushDataOf(notification.request.content.data)?.buildId ?? null;
}

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // The build screen showing this build shows the result itself, so its push is not displayed (ADR-020 Decision 7).
    const buildId = buildIdOf(notification);
    const show = buildId === null || !isShownBuild(buildId);
    return {
      shouldShowAlert: show,
      shouldPlaySound: show,
      shouldSetBadge: false,
      shouldShowBanner: show,
      shouldShowList: show,
    };
  },
});

/** Responses already acted on, so a tap that launched the app is not acted on again if the tabs mount again. */
const handledResponses = new Set<string>();

/** The tab a reminder opens: Progress for a streak milestone, Home for a lesson reminder or a push that names no screen. */
type TabRoute = typeof HOME_ROUTE | typeof PROGRESS_ROUTE;

function tabRouteOf(data: Record<string, unknown> | undefined): TabRoute {
  return data?.screen === PUSH_SCREEN.progress ? PROGRESS_ROUTE : HOME_ROUTE;
}

/** Where a tapped push goes: a build push opens that build (ticket 108), the Sunday recap opens the week (124ae), and a reminder its tab. The app's one tap handler. */
interface PushOpeners {
  openBuild: (buildId: string) => void;
  openWeek: () => void;
  openTab: (route: TabRoute) => void;
}

function openTappedPush(client: QueryClient, { openBuild, openWeek, openTab }: PushOpeners, response: Notifications.NotificationResponse): void {
  const id = response.notification.request.identifier;
  if (handledResponses.has(id)) return;
  handledResponses.add(id);
  const { data } = response.notification.request.content;
  if (isWeeklyRecapPush(data)) {
    openWeek();
    return;
  }
  const buildId = buildIdOf(response.notification);
  if (buildId === null) {
    openTab(tabRouteOf(data));
    return;
  }
  void invalidateBuildQueries(client, buildId);
  // The build screen is already showing it and shows the result itself.
  if (!isShownBuild(buildId)) openBuild(buildId);
}

/**
 * Requests push notification permissions on first mount, obtains the
 * Expo push token, and registers it with the backend.
 *
 * Must be called once from a component that is rendered when the user is
 * authenticated (e.g. the tabs layout).
 */
export function useNotifications() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const openTapped = useEffectEvent((response: Notifications.NotificationResponse) =>
    openTappedPush(queryClient, {
      openBuild: (buildId) => router.push(buildRoute(buildId)),
      openWeek: () => router.push(WEEK_ROUTE),
      openTab: (route) => router.replace(route),
    }, response));

  useEffect(() => {
    // Background registration has no screen to report to: log, and never block app load.
    registerForPushNotifications(queryClient).catch((err) => {
      warnBreadcrumb(BREADCRUMB_CATEGORY.push, 'Push registration failed', err);
    });

    // A push that arrives while the app is open: the server has a finished build to read.
    const received = Notifications.addNotificationReceivedListener((notification) => {
      const buildId = buildIdOf(notification);
      if (buildId !== null) void invalidateBuildQueries(queryClient, buildId);
    });
    const tapped = Notifications.addNotificationResponseReceivedListener(openTapped);
    // The tap that launched the app arrived before the listener existed.
    const launching = Notifications.getLastNotificationResponse();
    if (launching !== null) openTapped(launching);

    return () => {
      received.remove();
      tapped.remove();
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
    warnBreadcrumb(BREADCRUMB_CATEGORY.push, 'Push token registration failed', err);
  }
}
