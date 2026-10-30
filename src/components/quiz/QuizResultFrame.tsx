import React, { type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BookmarkButton } from '@/components/ui/BookmarkButton';
import { circleButtonStyle, CIRCLE_BUTTON_SIZE } from '@/components/ui/circleButtonStyle';
import { StreakCalendar } from '@/components/ui/StreakCalendar';
import { colors, radius, shadow, spacing } from '@/theme';

/** The header's controls row: tall enough for a 44pt touch target. */
const HEADER_ROW_HEIGHT = CIRCLE_BUTTON_SIZE;

/** The header's streak calendar: a little smaller than Home's, in the same shape. */
const HEADER_CALENDAR_SIZE = 40;

/** Where the header row sits on screen, so an overlay (the XP chip) can land on the streak flame. */
export function headerRowBox(topInset: number) {
  return { top: topInset + spacing.sm, height: HEADER_ROW_HEIGHT };
}

/** The scrolling body's padding: the bottom clears the home-indicator inset and the screen's rounded corners. */
export function frameContentStyle(bottomInset: number) {
  return [quizFrameStyles.content, { paddingBottom: bottomInset + spacing.md }];
}

/**
 * The frame every non-question quiz view shares: an inset-aware header with the
 * bookmark (left), the optional day `streak`, `rating` and close (right), and a scrolling body.
 * `overlay` renders above the body (celebrations).
 */
export function QuizResultFrame({ onClose, saved, onToggleSave, streak, rating, overlay, children }: {
  onClose: () => void;
  saved: boolean;
  onToggleSave: () => void;
  streak?: number;
  rating?: ReactNode;
  overlay?: ReactNode;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
        <View testID="quiz-frame-header" style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <View style={styles.headerRow}>
            <BookmarkButton saved={saved} onToggle={onToggleSave} style={styles.circleBtn} />
            {streak !== undefined && streak > 0 && (
              <View pointerEvents="none" style={styles.headerCentre}>
                <StreakCalendar streak={streak} size={HEADER_CALENDAR_SIZE} />
              </View>
            )}
            <View style={styles.headerRight}>
              {rating && <View testID="header-rating-bubble" style={styles.bubble}>{rating}</View>}
              <Pressable onPress={onClose} style={styles.circleBtn} accessibilityLabel="Close quiz results">
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>
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
    paddingHorizontal: spacing.md,
    // paddingTop is applied inline via useSafeAreaInsets() — not hardcoded here
    paddingBottom:     spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  headerRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    height:         HEADER_ROW_HEIGHT,
  },
  // Spans the row so the streak sits in the true centre, whatever the sides hold.
  headerCentre: {
    position:       'absolute',
    top:            0,
    bottom:         0,
    left:           0,
    right:          0,
    alignItems:     'center',
    justifyContent: 'center',
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bubble: {
    flexDirection:     'row',
    alignItems:        'center',
    height:            HEADER_ROW_HEIGHT,
    paddingHorizontal: spacing.xs,
    borderRadius:      radius.pill,
    backgroundColor:   colors.surface,
    ...shadow.card,
  },
  circleBtn: circleButtonStyle,
  content:   { padding: spacing.md, flexGrow: 1 },
});

const styles = quizFrameStyles;
