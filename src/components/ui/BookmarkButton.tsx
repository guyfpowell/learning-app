import React from 'react';
import { Pressable, PressableProps, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/theme';

interface BookmarkButtonProps extends Omit<PressableProps, 'onPress'> {
  saved: boolean;
  onToggle: () => void;
  /** Draws the icon in this colour, saved or not (a header over a coloured screen). */
  color?: string;
}

export function BookmarkButton({ saved, onToggle, disabled, style, color, ...rest }: BookmarkButtonProps) {
  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={saved ? 'Remove from saved lessons' : 'Save lesson'}
      style={[styles.button, disabled && styles.disabled, style as object]}
      {...rest}
    >
      <Ionicons
        name={saved ? 'bookmark' : 'bookmark-outline'}
        size={22}
        color={color ?? (saved ? colors.teal : colors.textMuted)}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: spacing.xs,
  },
  disabled: {
    opacity: 0.5,
  },
});
