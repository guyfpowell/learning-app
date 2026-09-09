/**
 * Tag — difficulty pill — ticket 069 A3.
 *
 * Maps .asc-tag--beginner / --intermediate / --advanced from the design system.
 * Used for level labels in lesson cards and list rows.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, font, fontSize, radius, spacing } from '@/theme';

export type TagVariant = 'beginner' | 'intermediate' | 'advanced';

interface TagProps {
  variant: TagVariant;
  label: string;
  testID?: string;
}

const palette: Record<TagVariant, { bg: string; text: string }> = {
  beginner:     { bg: colors.successSoft,    text: '#217943' },  // success700
  intermediate: { bg: colors.brandSoft,      text: colors.brand },
  advanced:     { bg: colors.coralSoft,      text: colors.coralDark },
};

export function Tag({ variant, label, testID }: TagProps) {
  const { bg, text } = palette[variant];
  return (
    <View style={[styles.tag, { backgroundColor: bg }]} testID={testID}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical:   2,
    borderRadius:      radius.xs,
    alignSelf:         'flex-start',
  },
  label: {
    fontFamily: font.semibold,
    fontSize:   fontSize.xs,
  },
});
