import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
} from 'react-native';
import { colors, fontSize, radius, spacing, tracking } from '@/theme';
import { sentenceCase } from '@/lib/sentenceCase';

/**
 * The call-to-action face: a system serif, so a button reads as an action and not as UI text.
 * It is not one of the design system's fonts (Georgia ships with iOS; Android falls back to its serif).
 */
export const CTA_FONT = Platform.select({ ios: 'Georgia', default: 'serif' });

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
        <Text style={[styles.label, labelColor(variant)]}>{sentenceCase(label)}</Text>
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
    borderRadius:      radius.xs,
    alignItems:        'center',
    justifyContent:    'center',
    minHeight:         44,
  },
  sizeLg: {
    paddingHorizontal: spacing.xl,
    paddingVertical:   spacing.sm3,
    minHeight:         52,
    borderRadius:      radius.xs,
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
    fontFamily:    CTA_FONT,
    fontSize:      fontSize.base,
    letterSpacing: tracking.normal,
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
