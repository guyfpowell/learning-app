import { useEffect, useState, type ReactNode } from 'react';
import { Keyboard, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@/theme';

/** The tallest action it holds: a `size="lg"` Button. */
const ACTION_HEIGHT = 52;

/** Space a scrolling page leaves at its foot so its last line clears the pinned action (096). */
export const PINNED_ACTION_CLEARANCE = ACTION_HEIGHT + spacing.md * 2;

/**
 * A button floating at the foot of a screen that has no tab bar (096). The page scrolls behind it,
 * so pair it with a `glass` Button, and leave `PINNED_ACTION_CLEARANCE` under the page's content.
 */
export function PinnedAction({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  // A short-answer question opens the keyboard: lift the button above it.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', e => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return (
    <View
      testID="pinned-action"
      pointerEvents="box-none"
      style={[styles.bar, { bottom: Math.max(insets.bottom, keyboardHeight) + spacing.sm3 }]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    start:    spacing.md,
    end:      spacing.md,
  },
});
