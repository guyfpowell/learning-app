import React, { type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookmarkButton } from '@/components/ui/BookmarkButton';
import { colors, font, fontSize, spacing } from '@/theme';

/**
 * The frame every non-question quiz view shares: an inset-aware header with the
 * bookmark and close, and a scrolling body. `overlay` renders above the body (celebrations).
 */
export function QuizResultFrame({ onClose, saved, onToggleSave, overlay, children }: {
  onClose: () => void;
  saved: boolean;
  onToggleSave: () => void;
  overlay?: ReactNode;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <BookmarkButton saved={saved} onToggle={onToggleSave} />
          <Pressable onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close quiz results">
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
        {overlay}
    </View>
  );
}

export const quizFrameStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    // paddingTop is applied inline via useSafeAreaInsets() — not hardcoded here
    paddingBottom:     spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  closeBtn:  { padding: spacing.xs },
  closeText: {
    fontFamily: font.semibold,
    fontSize:   fontSize.md,
    color:      colors.textMuted,
  },
  content:   { padding: spacing.md, flexGrow: 1 },
});

const styles = quizFrameStyles;
