/**
 * Toast — transient notification banner — ticket 069 A3.
 *
 * A fixed-position overlay panel that appears at the bottom of the screen.
 * Dismissed by tapping the × button or by setting `visible={false}`.
 * Animation is intentionally omitted here — the visual shell is the A3
 * deliverable. Entrance/exit animation is a later enhancement.
 *
 * Variants:
 *   info     — brand cobalt
 *   success  — green
 *   warning  — amber
 *   error    — red
 */
import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, font, fontSize, radius, shadow, spacing } from '@/theme';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

interface ToastProps {
  message: string;
  variant?: ToastVariant;
  visible: boolean;
  onDismiss?: () => void;
}

const palette: Record<ToastVariant, { bg: string; text: string; icon: keyof typeof Feather.glyphMap }> = {
  info:    { bg: colors.brandSoft,    text: colors.brand,       icon: 'info' },
  success: { bg: colors.successSoft,  text: '#217943',          icon: 'check-circle' },  // success700
  warning: { bg: colors.warningSoft,  text: '#BE7C1C',          icon: 'alert-triangle' }, // amber700
  error:   { bg: colors.errorSoft,    text: colors.error,       icon: 'alert-circle' },
};

export function Toast({ message, variant = 'info', visible, onDismiss }: ToastProps) {
  if (!visible) return null;

  const { bg, text, icon } = palette[variant];

  return (
    <View style={[styles.container, shadow.md as object, { backgroundColor: bg }]}>
      <Feather name={icon} size={18} color={text} />
      <Text style={[styles.message, { color: text }]} numberOfLines={2}>
        {message}
      </Text>
      <Pressable
        testID="toast-dismiss"
        onPress={onDismiss}
        style={styles.dismiss}
        hitSlop={8}
      >
        <Feather name="x" size={18} color={text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            spacing.sm,
    padding:        spacing.md,
    borderRadius:   radius.md,
    margin:         spacing.md,
  },
  message: {
    flex:       1,
    fontFamily: font.medium,
    fontSize:   fontSize.sm,
  },
  dismiss: {
    padding: 2,
  },
});
