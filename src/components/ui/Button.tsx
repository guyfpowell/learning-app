import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
} from 'react-native';
import { colors, font, fontSize, radius, spacing, tracking } from '@/theme';

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'   // alias for secondary — kept for backward compat
  | 'ghost'
  | 'coral'
  | 'danger';

type ButtonSize = 'sm' | 'lg';

interface ButtonProps extends PressableProps {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shrink-wrap to label width — opt out of the default full-width centred layout. */
  inline?: boolean;
  loading?: boolean;
}

export function Button({
  label,
  variant = 'primary',
  size = 'sm',
  inline = false,
  loading = false,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        size === 'lg' && styles.sizeLg,
        inline ? styles.inlineShrink : styles.blockFull,
        variantStyle(variant),
        pressed && !isDisabled && variantPressedStyle(variant),
        isDisabled && styles.disabled,
        style as object,
      ]}
      disabled={isDisabled}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor(variant)} />
      ) : (
        <Text style={[styles.label, labelColor(variant)]}>{label.toUpperCase()}</Text>
      )}
    </Pressable>
  );
}

function variantStyle(v: ButtonVariant) {
  switch (v) {
    case 'primary':    return styles.primary;
    case 'coral':      return styles.coral;
    case 'danger':     return styles.danger;
    case 'ghost':      return styles.ghost;
    case 'secondary':
    case 'outline':    return styles.secondary;
  }
}

function variantPressedStyle(v: ButtonVariant) {
  switch (v) {
    case 'primary':    return styles.primaryPressed;
    case 'coral':      return styles.coralPressed;
    case 'danger':     return styles.dangerPressed;
    case 'ghost':      return styles.ghostPressed;
    case 'secondary':
    case 'outline':    return styles.secondaryPressed;
  }
}

function labelColor(v: ButtonVariant) {
  switch (v) {
    case 'primary':
    case 'coral':
    case 'danger':    return styles.labelOnColor;
    case 'secondary':
    case 'outline':   return styles.labelBrand;
    case 'ghost':     return styles.labelMuted;
  }
}

function spinnerColor(v: ButtonVariant): string {
  switch (v) {
    case 'primary':
    case 'coral':
    case 'danger':  return colors.onBrand;
    case 'ghost':   return colors.textMuted;
    default:        return colors.brand;
  }
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.lg,
    paddingVertical:   spacing.sm + 2,
    borderRadius:      radius.btn,
    alignItems:        'center',
    justifyContent:    'center',
    minHeight:         44,
  },
  sizeLg: {
    paddingHorizontal: spacing.xl,
    paddingVertical:   spacing.sm3,
    minHeight:         52,
    borderRadius:      radius.sm,
  },
  blockFull: {
    alignSelf: 'center',
    width:     '100%' as const,
    maxWidth:  420,
  },
  inlineShrink: {
    alignSelf: 'flex-start',
  },

  // ── Variant fills ─────────────────────────────────────────────────────────
  primary: {
    backgroundColor: colors.brand,
  },
  primaryPressed: {
    backgroundColor: colors.brandPress,
  },

  secondary: {
    backgroundColor: 'transparent',
    borderWidth:     2,
    borderColor:     colors.brand,
  },
  secondaryPressed: {
    backgroundColor: colors.brandSoft,
  },

  ghost: {
    backgroundColor: 'transparent',
  },
  ghostPressed: {
    backgroundColor: colors.surfaceSunken,
  },

  coral: {
    backgroundColor: colors.coral,
  },
  coralPressed: {
    backgroundColor: colors.coralDark,
  },

  danger: {
    backgroundColor: colors.error,
  },
  dangerPressed: {
    backgroundColor: '#AC2724',  // danger700
  },

  disabled: {
    opacity: 0.5,
  },

  // ── Label colours ─────────────────────────────────────────────────────────
  label: {
    fontFamily:    font.bold,
    fontSize:      fontSize.sm,
    letterSpacing: tracking.caps,
  },
  labelOnColor: {
    color: colors.onBrand,
  },
  labelBrand: {
    color: colors.brand,
  },
  labelMuted: {
    color: colors.textMuted,
  },
});
