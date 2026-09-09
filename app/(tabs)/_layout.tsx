import { useState } from 'react';
import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
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

  // Safe-area insets — used to push the email verification banner below the
  // notch / Dynamic Island. The banner renders outside any screen's SafeAreaView,
  // so it sits at y=0 without this. (069 item 9)
  const insets = useSafeAreaInsets();

  const { data: currentUser } = useCurrentUser();
  const resendVerification = useResendVerification();
  const [resendSent, setResendSent] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      {currentUser && !currentUser.emailVerified && (
        <View
          testID="email-verification-banner"
          style={{
            backgroundColor: '#fffbeb',
            borderBottomWidth: 1,
            borderBottomColor: '#fde68a',
            paddingTop: insets.top + spacing.sm,
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
