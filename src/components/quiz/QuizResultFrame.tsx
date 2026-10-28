import React, { type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookmarkButton } from '@/components/ui/BookmarkButton';
import { colors, font, fontSize, spacing } from '@/theme';

/** The scrolling body's padding: the bottom clears the home-indicator inset and the screen's rounded corners. */
export function frameContentStyle(bottomInset: number) {
  return [quizFrameStyles.content, { paddingBottom: bottomInset + spacing.md }];
}

/**
 * The frame every non-question quiz view shares: an inset-aware header with the
 * bookmark (left), the optional `rating` and close (right), and a scrolling body.
 * `overlay` renders above the body (celebrations).
 */
export function QuizResultFrame({ onClose, saved, onToggleSave, rating, overlay, children }: {
  onClose: () => void;
  saved: boolean;
  onToggleSave: () => void;
  rating?: ReactNode;
  overlay?: ReactNode;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
        <View testID="quiz-frame-header" style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <BookmarkButton saved={saved} onToggle={onToggleSave} />
          <View style={styles.headerRight}>
            {rating}
            <Pressable onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close quiz results">
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>
        </View>
        <ScrollView testID="quiz-frame-content" contentContainerStyle={frameContentStyle(insets.bottom)}>{children}</ScrollView>
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  closeBtn:  { padding: spacing.xs },
  closeText: {
    fontFamily: font.semibold,
    fontSize:   fontSize.md,
    color:      colors.textMuted,
  },
  content:   { padding: spacing.md, flexGrow: 1 },
});

const styles = quizFrameStyles;
