import { useState, useEffect, useCallback } from 'react';
import { Tabs } from 'expo-router';
import { View, Text, AppState, type ColorValue } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, fontSize, spacing } from '@/theme';
import { useNotifications } from '@/hooks/useNotifications';
import { useCurrentUser, useResendVerification } from '@/hooks/useEmailVerification';
import { iapService } from '@/services/iap.service';
import { useAuthStore } from '@/store/auth.store';
import * as Sentry from '@sentry/react-native';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// Verification banner colours — not in the design system's amber scale (that's
// #FFEECF/#EDB345/#BE7C1C); these are a distinct, deliberately lighter shade.
const BANNER_BG = '#fffbeb';
const BANNER_BORDER = '#fde68a';
const BANNER_TEXT = '#92400e';

function tabIcon(name: IoniconName, focusedName: IoniconName) {
  return ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <Ionicons name={focused ? focusedName : name} size={24} color={color} />
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
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      }
    });
    return () => subscription.remove();
  }, [queryClient]);

  // Belt and braces — also invalidate whenever any tab screen gains focus, so
  // switching tabs (e.g. Profile -> Progress) clears a stale banner even if
  // the foreground event was missed. `useFocusEffect` on this layout would
  // NOT do this: the layout itself stays mounted/focused across tab switches,
  // only its child screens' focus changes, so the listener must live on `Tabs`.
  const invalidateCurrentUser = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
  }, [queryClient]);

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
          backgroundColor: showBanner ? BANNER_BG : colors.bg,
        }}
      />
      {showBanner && (
        <View
          testID="email-verification-banner"
          style={{
            backgroundColor: BANNER_BG,
            borderBottomWidth: 1,
            borderBottomColor: BANNER_BORDER,
            paddingTop: spacing.sm,
            paddingBottom: spacing.sm,
            paddingHorizontal: spacing.md,
          }}
        >
          <Text style={{ fontSize: fontSize.xs, color: BANNER_TEXT }}>
            Please verify your email to keep your account active.{' '}
            {resendSent ? (
              <Text style={{ fontFamily: font.medium }}>Email sent!</Text>
            ) : (
              <Text
                style={{ fontFamily: font.medium, textDecorationLine: 'underline' }}
                onPress={() => {
                  if (resendVerification.isPending) return;
                  resendVerification.mutate(undefined, {
                    onSuccess: () => setResendSent(true),
                  });
                }}
              >
                {resendVerification.isPending ? 'Sending…' : 'Resend verification email'}
              </Text>
            )}
          </Text>
        </View>
      )}
      <Tabs
        screenListeners={{ focus: invalidateCurrentUser }}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.brand,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.borderSubtle,
          },
          tabBarLabelStyle: {
            fontFamily: font.medium,
            fontSize: fontSize.xs,
          },
        }}
      >
        <Tabs.Screen
          name="lessons"
          options={{ title: 'Home', tabBarIcon: tabIcon('book-outline', 'book') }}
        />
        <Tabs.Screen
          name="progress"
          options={{ title: 'Progress', tabBarIcon: tabIcon('bar-chart-outline', 'bar-chart') }}
        />
        <Tabs.Screen
          name="profile"
          options={{ title: 'Profile', tabBarIcon: tabIcon('person-outline', 'person') }}
        />
        <Tabs.Screen
          name="tracks"
          options={{ title: 'Tracks', tabBarIcon: tabIcon('library-outline', 'library') }}
        />
        <Tabs.Screen
          name="team"
          options={{ title: 'Team', tabBarIcon: tabIcon('people-outline', 'people') }}
        />
        <Tabs.Screen
          name="albert"
          options={{ title: 'Albert', tabBarIcon: tabIcon('sparkles-outline', 'sparkles') }}
        />
        {/* lesson/[id] lives inside (tabs)/ so the tab bar stays visible during a
            lesson (ADR-007). href: null hides it from the tab bar without moving it. */}
        <Tabs.Screen name="lesson/[id]" options={{ href: null }} />
        {/* track/[kind]/[id] — detail screen for a path of either kind (076d).
            href: null prevents it from leaking into the tab bar. */}
        <Tabs.Screen name="track/[kind]/[id]" options={{ href: null }} />
        {/* paywall — upgrade flow (073b Chunk 5).
            href: null keeps it off the tab bar; onUpgrade hooks navigate here. */}
        <Tabs.Screen name="paywall" options={{ href: null }} />
      </Tabs>
    </View>
  );
}
