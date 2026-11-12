/**
 * Toast — a transient notification banner.
 *
 * An ink panel with white text and a coloured icon for its variant. Dismissed by tapping the
 * × button (shown only when `onDismiss` is given) or by setting `visible={false}`. The caller
 * places it and times it.
 *
 * Variants (the icon's colour):
 *   info     — light cobalt
 *   success  — green
 *   warning  — gold
 *   error    — red
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Icon, type IconName } from '@/components/ui/Icon';
import { colors, font, shadow } from '@/theme';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

interface ToastProps {
  message: string;
  variant?: ToastVariant;
  visible: boolean;
  onDismiss?: () => void;
  /** Just the words: no icon, a shorter bar (the skip confirmation). */
  plain?: boolean;
}

const palette: Record<ToastVariant, { icon: IconName; color: string }> = {
  info:    { icon: 'info',      color: colors.brandSoft },
  success: { icon: 'correct',   color: colors.success },
  warning: { icon: 'warning',   color: colors.warning },
  error:   { icon: 'incorrect', color: colors.error },
};

export function Toast({ message, variant = 'info', visible, onDismiss, plain = false }: ToastProps) {
  if (!visible) return null;

  const { icon, color } = palette[variant];

  return (
    <View style={[styles.container, plain && styles.plain, shadow.md as object]}>
      {!plain && <Icon name={icon} size={20} color={color} strokeWidth={2.2} />}
      <Text style={styles.message} numberOfLines={2}>
        {message}
      </Text>
      {onDismiss && (
        <Pressable testID="toast-dismiss" onPress={onDismiss} style={styles.dismiss} hitSlop={8}>
          <Icon name="close" size={18} color={colors.white} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  plain: { minHeight: 52, paddingVertical: 0, paddingHorizontal: 18, borderRadius: 16 },
  container: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               12,
    paddingVertical:   13,
    paddingHorizontal: 16,
    borderRadius:      18,
    backgroundColor:   colors.surfaceInverse,
  },
  message: {
    flex:       1,
    fontFamily: font.bold,
    fontSize:   15,
    color:      colors.white,
  },
  dismiss: {
    padding: 2,
  },
});
