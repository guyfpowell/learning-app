import { useState, useEffect, useCallback } from 'react';
import { Tabs } from 'expo-router';
import { View, Text, AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, fontSize, spacing } from '@/theme';
import { useNotifications } from '@/hooks/useNotifications';
import { useCurrentUser, useResendVerification } from '@/hooks/useEmailVerification';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: IoniconName, focusedName: IoniconName) {
  return ({ color, focused }: { color: string; focused: boolean }) => (
    <Ionicons name={focused ? focusedName : name} size={24} color={color} />
  );
}

export default function TabsLayout() {
  // Register for push notifications once the authenticated tab shell mounts
  useNotifications();

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
          backgroundColor: showBanner ? '#fffbeb' : colors.bg,
        }}
      />
      {showBanner && (
        <View
          testID="email-verification-banner"
          style={{
            backgroundColor: '#fffbeb',
            borderBottomWidth: 1,
            borderBottomColor: '#fde68a',
            paddingTop: spacing.sm,
            paddingBottom: spacing.sm,
            paddingHorizontal: 16,
          }}
        >
          <Text style={{ fontSize: fontSize.xs, color: '#92400e' }}>
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
          name="settings"
          options={{ title: 'Settings', tabBarIcon: tabIcon('settings-outline', 'settings') }}
        />
      </Tabs>
    </View>
  );
}
