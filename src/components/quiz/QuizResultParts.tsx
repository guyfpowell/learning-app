import React, { useRef, type ComponentRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import type { ScreenRect } from '@/components/ui/CelebrationOverlay';
import { Icon } from '@/components/ui/Icon';
import type { ResultTone } from '@/components/quiz/resultTone';
import { colors, font, fontSize, press, radius, results, spacing } from '@/theme';

/** The milestone card's subtitle: a warm off-white on coral, not a theme token. */
const MILESTONE_SUBTEXT = '#fff7ed';
/** From this streak the milestone card says more than "Keep going!". */
const UNSTOPPABLE_STREAK = 30;

type Arrow = '↑' | '↓' | '=';

/** Which way the track average moved. A used retry reads as "=": the penalty is already in the score. */
function arrowOf(average: number | null, previous: number | null, retakeUsed: boolean): Arrow | null {
  if (previous === null) return null;
  if (retakeUsed) return '=';
  return average !== null && average >= previous ? '↑' : '↓';
}

/** Share of the pill's height the gem takes. */
const GEM_SIZE = 18;

/** "76% ↑ track average", on the verdict colour. */
export function TrackAverageBadge({ average, previous, retakeUsed, tone }: { average: number | null; previous: number | null; retakeUsed: boolean; tone: ResultTone }) {
  const arrow = arrowOf(average, previous, retakeUsed);
  return (
    <View style={styles.trackAverage} accessibilityLabel={`Track average ${average !== null ? average + ' percent' : 'unavailable'}`}>
      <Text style={[styles.scorePercent, { color: results[tone].fg }]}>{average !== null ? `${average}%` : 'n/a'}</Text>
      {arrow && <Text style={[styles.scorePercent, { color: results[tone].fg }]}>{arrow}</Text>}
      <Text style={[styles.scoreLabel, { color: results[tone].tint }]}>track average</Text>
    </View>
  );
}

/** The XP award chip. It reports where it sits on the screen, so the XP animation can fly back onto it. */
export function XpAward({ xp, tone, onMeasure }: { xp: number; tone: ResultTone; onMeasure?: (rect: ScreenRect) => void }) {
  const ref = useRef<ComponentRef<typeof View>>(null);
  return (
    <View
      ref={ref}
      collapsable={false}
      testID="xp-chip"
      style={[styles.xpChip, { shadowColor: results[tone].edge }]}
      onLayout={() => ref.current?.measureInWindow((x, y, width, height) => onMeasure?.({ x, y, width, height }))}
    >
      <Icon name="xp" size={GEM_SIZE} color={colors.xpDark} fill={colors.xp} />
      <Text style={styles.xpChipText}>+{xp} XP</Text>
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
      <Text style={styles.milestoneSubtext}>{streak >= UNSTOPPABLE_STREAK ? "You're unstoppable." : 'Keep going!'}</Text>
    </Animated.View>
  );
}

export function CoachingCard({ coaching }: { coaching: string }) {
  return (
    <View style={styles.coachingCard}>
      <Text style={styles.coachingLabel}>AI Coaching</Text>
      <Text style={styles.coachingText}>{coaching}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  trackAverage: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  scorePercent: {
    fontFamily: font.extrabold,
    fontSize:   fontSize.md,
  },
  scoreLabel: {
    fontFamily: font.medium,
    fontSize:   fontSize.sm,
  },
  xpChip: {
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
  xpChipText: {
    fontFamily: font.extrabold,
    fontSize:   fontSize.md,
    color:      colors.xpText,
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
  coachingCard: {
    backgroundColor: colors.brandSoft,
    borderWidth:     1,
    borderColor:     colors.brand + '40',
    borderRadius:    radius.card,
    padding:         spacing.md,
    marginBottom:    spacing.md,
    gap:             spacing.xs,
  },
  coachingLabel: {
    fontFamily:   font.semibold,
    fontSize:     fontSize.xs,
    color:        colors.brand,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  coachingText: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textBody,
  },
});
