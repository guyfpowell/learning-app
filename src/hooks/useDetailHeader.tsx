import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { NativeStackNavigationOptions } from 'expo-router';
import { colors, font, fontSize, radius } from '@/theme';
import { circleButtonStyle, headerButtonStyle } from '@/components/ui/circleButtonStyle';
import { HOME_ROUTE } from '@/lib/routes';

/**
 * Native Stack header with a back button, for a detail screen in the root Stack (ADR-016).
 * Back pops the stack; opened with nothing to go back to (a fresh launch or a deep link),
 * it lands on Home.
 */
/** Over a coloured screen the back button is a translucent rounded square (the design's 14 at 44pt). */
const ON_COLOUR_BUTTON = { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: radius.md - 2, shadowOpacity: 0, elevation: 0 };

/**
 * `onColour` is for a screen that washes itself in a colour: the header goes transparent over it,
 * and the back button is drawn for it.
 */
export function useDetailHeader(title: string, onColour = false): NativeStackNavigationOptions {
  const router = useRouter();

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace(HOME_ROUTE);
  };

  const backButton = (
    <Pressable
      testID="detail-back"
      onPress={handleBack}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      style={onColour ? [circleButtonStyle, ON_COLOUR_BUTTON] : headerButtonStyle}
    >
      <Ionicons name="chevron-back" size={fontSize.lg} color={onColour ? colors.white : colors.textMuted} />
    </Pressable>
  );

  return {
    headerShown: true,
    // SDK 58 on iOS 26+ defaults Stack headers to transparent (Liquid Glass), which would
    // lay the header over this screen's content.
    headerTransparent: onColour,
    title,
    headerStyle: { backgroundColor: onColour ? 'transparent' : colors.paper },
    headerTitleStyle: { fontFamily: font.semibold, fontSize: fontSize.md, color: colors.textStrong },
    headerBackVisible: false,
    headerLeft: () => backButton,
    // iOS 26 wraps a header item in a shared glass bubble; hiding it leaves just our own circle.
    unstable_headerLeftItems: () => [{ type: 'custom', element: backButton, hidesSharedBackground: true }],
  };
}
