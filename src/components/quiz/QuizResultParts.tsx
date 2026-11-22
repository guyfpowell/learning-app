import React, { useRef, type ComponentRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import type { ScreenRect } from '@/components/ui/CelebrationOverlay';
import { Icon } from '@/components/ui/Icon';
import type { ResultTone } from '@/components/quiz/resultTone';
import { accuracyArrowOf, accuracyTextOf, milestoneCheerOf, TRACK_ACCURACY_LABEL, type QuizResult } from '@learning/shared';
import { colors, font, fontSize, press, radius, results, spacing } from '@/theme';

/** The milestone card's subtitle: a warm off-white on coral, not a theme token. */
const MILESTONE_SUBTEXT = '#fff7ed';

/** The gem's size in the metres chip. */
const GEM_SIZE = 18;

/** "76% ↑ track accuracy", on the verdict colour. */
export function TrackAccuracyBadge({ accuracy, previous, tone }: { accuracy: QuizResult['trackAccuracy']; previous: QuizResult['previousTrackAccuracy']; tone: ResultTone }) {
  const arrow = accuracyArrowOf(accuracy, previous);
  const text = accuracyTextOf(accuracy);
  return (
    // One element read from its own text, in the order it shows.
    <View testID="track-accuracy" style={styles.trackAccuracy} accessible>
      <Text style={[styles.accuracyFigure, { color: results[tone].fg }]}>{text}</Text>
      {arrow && <Text style={[styles.accuracyFigure, { color: results[tone].fg }]}>{arrow}</Text>}
      <Text style={[styles.accuracyLabel, { color: results[tone].tint }]}>{TRACK_ACCURACY_LABEL}</Text>
    </View>
  );
}

/** The metres chip ("+34m · Level 4"). It reports where it sits on the screen, so the chip animation can fly back onto it. */
export function MetresAward({ copy, tone, onMeasure }: { copy: string; tone: ResultTone; onMeasure?: (rect: ScreenRect) => void }) {
  const ref = useRef<ComponentRef<typeof View>>(null);
  return (
    <View
      ref={ref}
      collapsable={false}
      testID="metres-chip"
      style={[styles.chip, { shadowColor: results[tone].edge }]}
      onLayout={() => ref.current?.measureInWindow((x, y, width, height) => onMeasure?.({ x, y, width, height }))}
    >
      <Icon name="gem" size={GEM_SIZE} color={colors.altitudeDark} fill={colors.altitude} />
      <Text style={styles.chipText}>{copy}</Text>
    </View>
  );
}

export function MilestoneCard({ milestone, streak, scale }: { milestone: string; streak: number; scale: Animated.Value }) {
  return (
    <Animated.View
      testID="milestone-card"
      style={[styles.milestoneCard, { transform: [{ scale }], opacity: scale }]}
      accessibilityRole="alert"
    >
      <Text style={styles.milestoneText}>🎉 {milestone}!</Text>
      <Text style={styles.milestoneSubtext}>{milestoneCheerOf(streak)}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  trackAccuracy: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  accuracyFigure: {
    fontFamily: font.extrabold,
    fontSize:   fontSize.md,
  },
  accuracyLabel: {
    fontFamily: font.medium,
    fontSize:   fontSize.sm,
  },
  chip: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.sm,
    backgroundColor:   colors.white,
    borderRadius:      radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.sm,
    shadowOffset:      { width: 0, height: press.edge - 1 },
    shadowOpacity:     1,
    shadowRadius:      0,
    elevation:         press.edge,
  },
  chipText: {
    fontFamily: font.extrabold,
    fontSize:   fontSize.md,
    color:      colors.altitudeText,
  },
  milestoneCard: {
    backgroundColor: colors.coral,
    borderRadius:    radius.card,
    padding:         spacing.md,
    marginBottom:    spacing.lg,
    alignItems:      'center',
  },
  milestoneText: {
    fontFamily: font.semibold,
    fontSize:   fontSize.lg,
    color:      colors.white,
    textAlign:  'center',
  },
  milestoneSubtext: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      MILESTONE_SUBTEXT,
    marginTop:  spacing.xs,
    textAlign:  'center',
  },
});
