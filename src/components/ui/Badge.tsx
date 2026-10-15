import React from 'react';
import { StyleSheet, Text, View, ViewProps } from 'react-native';
import type { SkillLevel } from '@learning/shared';
import { colors, font, fontSize, radius, spacing } from '@/theme';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info';

interface BadgeProps {
  label: string;
  variant: BadgeVariant;
  testID?: string;
}

/** The badge a level (or a lesson's difficulty) shows. Expert has no colour of its own yet (080r). */
export const LEVEL_BADGE_VARIANT: Record<SkillLevel, BadgeVariant> = {
  beginner:     'success',
  intermediate: 'warning',
  advanced:     'error',
  expert:       'info',
};

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: colors.successSoft, text: colors.success },
  warning: { bg: colors.warningSoft, text: '#BE7C1C' },  // amber700
  error:   { bg: colors.errorSoft,   text: colors.error },
  info:    { bg: colors.brandSoft,   text: colors.brand },
};

export function Badge({ label, variant, testID }: BadgeProps) {
  const { bg, text } = variantStyles[variant];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]} testID={testID}>
      <Text style={[styles.label, { color: text }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical:   2,
    borderRadius:      radius.xs,
    alignSelf:         'flex-start',
  },
  label: {
    fontFamily:    font.semibold,
    fontSize:      fontSize.xs,
    letterSpacing: 0.8,
  },
});
