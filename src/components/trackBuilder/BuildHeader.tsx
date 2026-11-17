import { Pressable, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { BUILD_SCREEN_COPY } from '@learning/shared';
import { Icon } from '@/components/ui/Icon';
import { colors, font } from '@/theme';

/**
 * The build screen's native header. It owns the top safe-area inset, and its back button is the screen's
 * (`onBack`), which falls to Tracks when there is nowhere to pop to.
 */
export function BuildHeader({ onBack }: { onBack: () => void }) {
  return (
    <Stack.Screen
      options={{
        headerShown: true,
        // SDK 58 on iOS 26+ defaults Stack headers to transparent (Liquid Glass), which would
        // lay the header over this screen's content.
        headerTransparent: false,
        title: BUILD_SCREEN_COPY.title,
        headerStyle: { backgroundColor: colors.paper },
        headerShadowVisible: false,
        headerTitleAlign: 'center',
        headerTitleStyle: { fontFamily: font.bold, fontSize: 13, color: colors.textMuted },
        headerLeft: () => (
          <Pressable
            testID="build-back"
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.backBtn}
          >
            <Icon name="back" size={22} color={colors.textStrong} strokeWidth={2.2} />
          </Pressable>
        ),
        headerBackVisible: false,
      }}
    />
  );
}

const styles = StyleSheet.create({
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
