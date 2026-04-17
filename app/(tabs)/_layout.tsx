import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, fontSize } from '@/theme';
import { useNotifications } from '@/hooks/useNotifications';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: IoniconName, focusedName: IoniconName) {
  return ({ color, focused }: { color: string; focused: boolean }) => (
    <Ionicons name={focused ? focusedName : name} size={24} color={color} />
  );
}

export default function TabsLayout() {
  // Register for push notifications once the authenticated tab shell mounts
  useNotifications();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.teal,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontFamily: font.medium,
          fontSize: fontSize.xs,
        },
      }}
    >
      <Tabs.Screen
        name="lessons"
        options={{ title: 'Lessons', tabBarIcon: tabIcon('book-outline', 'book') }}
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
        name="settings"
        options={{ title: 'Settings', tabBarIcon: tabIcon('settings-outline', 'settings') }}
      />
    </Tabs>
  );
}
