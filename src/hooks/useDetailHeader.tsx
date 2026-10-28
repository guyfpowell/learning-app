import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { NativeStackNavigationOptions } from 'expo-router';
import { colors, font, fontSize } from '@/theme';
import { HOME_ROUTE } from '@/lib/routes';

/** Minimum touch target, in points. */
const BACK_TARGET = 44;

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
        <Ionicons name="chevron-back" size={fontSize.lg} color={colors.brand} />
      </Pressable>
    ),
  };
}

const styles = StyleSheet.create({
  backBtn: { width: BACK_TARGET, height: BACK_TARGET, alignItems: 'center', justifyContent: 'center' },
});
