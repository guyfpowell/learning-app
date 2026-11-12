import { useState, useEffect, useCallback } from 'react';
import { Tabs } from 'expo-router';
import { View, Pressable, AppState, StyleSheet, type ColorValue, type PressableProps } from 'react-native';
import { BlurView } from 'expo-blur';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/ui/Icon';
import { AlbertTabIcon } from '@/components/albert/AlbertTabIcon';
import { VerifyEmailBanner } from '@/components/auth/VerifyEmailBanner';
import { useHasAlbertSuggestion } from '@/hooks/useAlbertSuggestion';
import { colors, font, fontSize, radius, shadow, spacing } from '@/theme';
import { TEAM_FEATURE_ENABLED } from '@/config/features';
import { useNotifications } from '@/hooks/useNotifications';
import { useCurrentUser, useResendVerification } from '@/hooks/useEmailVerification';
import { CURRENT_USER_QUERY_KEY } from '@/lib/queryKeys';
import { TAB_BAR_HEIGHT } from '@/lib/safeArea';
import { iapService } from '@/services/iap.service';
import { useAuthStore } from '@/store/auth.store';
import * as Sentry from '@sentry/react-native';

// Lower is more see-through (0-100).
const TAB_BAR_BLUR = 25;

type TabButtonProps = Pick<PressableProps, 'onPress' | 'onLongPress' | 'testID' | 'accessibilityLabel'> & {
  children: React.ReactNode;
  accessibilityState?: { selected?: boolean };
};

// The selected tab is told apart by its filled cobalt icon, not a highlight.
function TabButton({ children, accessibilityState, ...pressable }: TabButtonProps) {
  return (
    <Pressable
      {...pressable}
      accessibilityRole="tab"
      accessibilityState={accessibilityState}
      style={styles.tabButton}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabButton: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  tabBarBlur: { borderRadius: radius.pill },
});

/** The Albert tab's icon: with a dot while a suggestion waits. */
function LiveAlbertTabIcon({ color, focused }: { color?: string; focused: boolean }) {
  return <AlbertTabIcon color={color} focused={focused} badge={useHasAlbertSuggestion()} />;
}

/** The active tab's icon is filled in its colour. */
function tabIcon(name: IconName) {
  return ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <Icon name={name} size={24} color={typeof color === 'string' ? color : undefined} fill={focused && typeof color === 'string' ? color : 'none'} />
  );
}

export default function TabsLayout() {
  // Register for push notifications once the authenticated tab shell mounts
  useNotifications();

  // Configure RevenueCat once the user is authenticated (073b Chunk 5).
  // configure() is called once with the API key; logIn() associates purchases
  // with our user ID so we can link Apple transactions to the right account.
  const userId = useAuthStore((s) => s.user?.id);
  useEffect(() => {
    const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY ?? '';
    if (!apiKey || !userId) return;
    iapService.configure(apiKey);
    iapService.logIn(userId).catch((err) => {
      // non-fatal — purchases still work, but record it for diagnosis
      Sentry.addBreadcrumb({ category: 'iap', message: 'logIn failed', level: 'warning', data: { err: String(err) } });
    });
  }, [userId]);

  const queryClient = useQueryClient();

  // Refetch currentUser when the app returns to the foreground — the exact
  // moment the user comes back from the browser after clicking the verify link.
  // Fire-and-forget: a failed refetch lands in the query's own error state, which
  // `useCurrentUser` callers read, so `void` loses nothing.
  const invalidateCurrentUser = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
  }, [queryClient]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') invalidateCurrentUser();
    });
    return () => subscription.remove();
  }, [invalidateCurrentUser]);

  // Belt and braces — also invalidate whenever any tab screen gains focus, so
  // switching tabs (e.g. Profile -> Progress) clears a stale banner even if
  // the foreground event was missed. `useFocusEffect` on this layout would
  // NOT do this: the layout itself stays mounted/focused across tab switches,
  // only its child screens' focus changes, so the listener must live on `Tabs`.
  // Safe-area insets — used to push the email verification banner below the
  // notch / Dynamic Island. The banner renders outside any screen's SafeAreaView,
  // so it sits at y=0 without this. (069 item 9)
  const insets = useSafeAreaInsets();

  const { data: currentUser } = useCurrentUser();
  const resendVerification = useResendVerification();
  const [resendSent, setResendSent] = useState(false);

  const showBanner = !!(currentUser && !currentUser.emailVerified);

  return (
    <View style={{ flex: 1 }}>
      <View
        testID="tab-top-inset"
        style={{
          paddingTop: insets.top,
          backgroundColor: colors.bg,
        }}
      />
      {showBanner && (
        <VerifyEmailBanner
          sent={resendSent}
          sending={resendVerification.isPending}
          onResend={() => resendVerification.mutate(undefined, { onSuccess: () => setResendSent(true) })}
        />
      )}
      <Tabs
        screenListeners={{ focus: invalidateCurrentUser }}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.brand,
          tabBarInactiveTintColor: colors.textSubtle,
          tabBarButton: (props) => <TabButton {...props} />,
          tabBarStyle: {
            position: 'absolute',
            // `start`/`end`, not `left`/`right`: React Navigation sets `start: 0`/`end: 0` on the bar, which win over them.
            start: spacing.lg,
            end: spacing.lg,
            bottom: Math.max(insets.bottom - spacing.sm, spacing.md) + spacing.xs,
            height: TAB_BAR_HEIGHT,
            paddingTop: 0,
            paddingBottom: 0,
            borderRadius: radius.pill,
            borderTopWidth: 0,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
            backgroundColor: 'transparent',
            overflow: 'hidden',
            ...shadow.md,
          },
          tabBarItemStyle: { paddingVertical: spacing.xs },
          tabBarBackground: () => (
            <BlurView testID="tab-bar-blur" intensity={TAB_BAR_BLUR} tint="light" style={[StyleSheet.absoluteFill, styles.tabBarBlur]} />
          ),
          tabBarLabelStyle: {
            fontFamily: font.medium,
            fontSize: fontSize.xs,
          },
        }}
      >
        <Tabs.Screen
          name="lessons"
          options={{ title: 'Home', tabBarIcon: tabIcon('home') }}
        />
        <Tabs.Screen
          name="progress"
          options={{ title: 'Progress', tabBarIcon: tabIcon('progress') }}
        />
        <Tabs.Screen
          name="profile"
          options={{ title: 'Profile', tabBarIcon: tabIcon('profile') }}
        />
        <Tabs.Screen
          name="tracks"
          options={{ title: 'Tracks', tabBarIcon: tabIcon('tracks') }}
        />
        <Tabs.Screen
          name="team"
          options={{
            title: 'Team',
            tabBarIcon: tabIcon('team'),
            href: TEAM_FEATURE_ENABLED ? undefined : null,
          }}
        />
        <Tabs.Screen
          name="albert"
          options={{
            title: 'Albert',
            tabBarIcon: ({ color, focused }) => <LiveAlbertTabIcon color={typeof color === 'string' ? color : undefined} focused={focused} />,
          }}
        />
      </Tabs>
    </View>
  );
}
