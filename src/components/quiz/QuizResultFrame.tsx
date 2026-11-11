import React, { type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BookmarkButton } from '@/components/ui/BookmarkButton';
import { circleButtonStyle, CIRCLE_BUTTON_SIZE } from '@/components/ui/circleButtonStyle';
import { PinnedAction, PINNED_ACTION_CLEARANCE } from '@/components/ui/PinnedAction';
import { Contours } from '@/components/ui/Contours';
import { StatusBar } from 'expo-status-bar';
import { colors, gradients, radius, results, shadow, spacing } from '@/theme';
import { TONE_LOOK, type ResultTone } from '@/components/quiz/resultTone';

/** Header buttons over a colour are rounded squares, not circles (the design's 14 at 44pt). */
const TONED_BUTTON_RADIUS = radius.md - 2;

/** How far down the screen the contour lines reach: they stay up top, away from the text. */
const CONTOUR_HEIGHT = 420;

/** The header's controls row: tall enough for a 44pt touch target. */
const HEADER_ROW_HEIGHT = CIRCLE_BUTTON_SIZE;

/** Where the header row sits on screen, so an overlay (the XP chip) can land in the middle of it. */
export function headerRowBox(topInset: number) {
  return { top: topInset + spacing.sm, height: HEADER_ROW_HEIGHT };
}

/** The scrolling body's padding: the bottom clears the home-indicator inset and the screen's rounded corners. */
export function frameContentStyle(bottomInset: number) {
  return [quizFrameStyles.content, { paddingBottom: bottomInset + spacing.md }];
}

/**
 * The frame every non-question quiz view shares: an inset-aware header with the
 * bookmark (left), `rating` and close (right), and a scrolling body.
 * `action` is the view's one main button, pinned to the foot of the screen over the body (096).
 * `overlay` renders above the body (celebrations).
 * `tone` washes the frame in that verdict's gradient, with contour lines; with none the frame is plain paper.
 */
export function QuizResultFrame({ onClose, saved, onToggleSave, rating, action, overlay, tone, closable = true, children }: {
  onClose: () => void;
  saved: boolean;
  onToggleSave: () => void;
  rating?: ReactNode;
  action?: ReactNode;
  overlay?: ReactNode;
  tone?: ResultTone;
  /** False on the retry offer: the way on is "Try again", not leaving. */
  closable?: boolean;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // Over a colour the header buttons are translucent rounded squares with no shadow.
  const tonedButton = tone && { backgroundColor: TONE_LOOK[tone].buttonBg, borderRadius: TONED_BUTTON_RADIUS, shadowOpacity: 0, elevation: 0 };
  return (
    <View style={[styles.container, tone !== undefined && styles.toned]}>
        {tone !== undefined && (
          <>
            <StatusBar style={TONE_LOOK[tone].statusBar} />
            <LinearGradient testID="quiz-frame-gradient" colors={results[tone].gradient} style={StyleSheet.absoluteFill} />
            <Contours
              testID="quiz-frame-contours"
              color={tone === 'retry' ? results.retry.contour : colors.white}
              opacity={gradients.contourOpacity}
              width={width}
              height={CONTOUR_HEIGHT}
            />
          </>
        )}
        <View testID="quiz-frame-header" style={[styles.header, tone !== undefined && styles.headerToned, { paddingTop: insets.top + spacing.sm }]}>
          <View style={styles.headerRow}>
            <BookmarkButton saved={saved} onToggle={onToggleSave} style={[styles.circleBtn, tonedButton]} color={tone && results[tone].fg} />
            <View style={styles.headerRight}>
              {rating && <View testID="header-rating-bubble" style={[styles.bubble, tonedButton]}>{rating}</View>}
              {closable && (
                <Pressable onPress={onClose} style={[styles.circleBtn, tonedButton]} accessibilityLabel="Close quiz results">
                  <Ionicons name="close" size={22} color={tone ? results[tone].fg : colors.textMuted} />
                </Pressable>
              )}
            </View>
          </View>
        </View>
        <ScrollView
          testID="quiz-frame-content"
          contentContainerStyle={[...frameContentStyle(insets.bottom), action !== undefined && { paddingBottom: PINNED_ACTION_CLEARANCE + insets.bottom }]}
        >
          {children}
        </ScrollView>
        {action !== undefined && <PinnedAction>{action}</PinnedAction>}
        {overlay}
    </View>
  );
}

export const quizFrameStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  toned:     { backgroundColor: 'transparent' },
  header: {
    paddingHorizontal: spacing.md,
    // paddingTop is applied inline via useSafeAreaInsets() — not hardcoded here
    paddingBottom:     spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  headerToned: { borderBottomWidth: 0 },
  headerRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    height:         HEADER_ROW_HEIGHT,
  },
  // Spans the row so a title sits in the true centre, whatever the sides hold (the question view's "Test my knowledge").
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
