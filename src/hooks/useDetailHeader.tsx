import { Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import type { NativeStackNavigationOptions } from 'expo-router';
import { colors, font, fontSize, spacing } from '@/theme';
import { HOME_ROUTE } from '@/lib/routes';

/**
 * Native Stack header with a back button, for a detail screen in the root Stack (ADR-016).
 * Back pops the stack; opened with nothing to go back to (a fresh launch or a deep link),
 * it lands on Home.
 */
export function useDetailHeader(title: string): NativeStackNavigationOptions {
  const router = useRouter();

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace(HOME_ROUTE);
  };

  return {
    headerShown: true,
    // SDK 58 on iOS 26+ defaults Stack headers to transparent (Liquid Glass), which would
    // lay the header over this screen's content.
    headerTransparent: false,
    title,
    headerStyle: { backgroundColor: colors.paper },
    headerTitleStyle: { fontFamily: font.semibold, fontSize: fontSize.md, color: colors.textStrong },
    headerBackVisible: false,
    headerLeft: () => (
      <Pressable
        testID="detail-back"
        onPress={handleBack}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={styles.backBtn}
      >
        <Text style={styles.backText}>‹</Text>
      </Pressable>
    ),
  };
}

const styles = StyleSheet.create({
  backBtn: { paddingVertical: spacing.xs, paddingRight: spacing.sm },
  backText: { fontFamily: font.regular, fontSize: fontSize.lg, color: colors.brand },
});
