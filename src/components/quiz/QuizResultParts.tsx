import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors, font, fontSize, radius, spacing } from '@/theme';
import { FlameIcon } from '@/components/ui/Streak';

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

const ARROW_STYLE = { '↑': 'trackAverageUp', '↓': 'trackAverageDown', '=': 'trackAverageFlat' } as const;

export function TrackAverageBadge({ average, previous, retakeUsed }: { average: number | null; previous: number | null; retakeUsed: boolean }) {
  const arrow = arrowOf(average, previous, retakeUsed);
  return (
    <View accessibilityLabel={`Track average ${average !== null ? average + ' percent' : 'unavailable'}`}>
      <View style={styles.trackAverageValueRow}>
        <Text style={styles.scorePercent}>{average !== null ? `${average}%` : '—'}</Text>
        {arrow && <Text style={[styles.trackAverageBadge, styles[ARROW_STYLE[arrow]]]}>{arrow}</Text>}
      </View>
      <Text style={styles.scoreFraction}>Track Average</Text>
    </View>
  );
}

export function StreakRow({ streak }: { streak: number }) {
  return (
    <View style={styles.streakRow}>
      <FlameIcon size={18} />
      <Text style={styles.streakText}>{streak}-day streak</Text>
    </View>
  );
}

export function XpAward({ xp }: { xp: number }) {
  return (
    <View testID="xp-chip" style={styles.xpChip}>
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

/** Recessive on purpose: a summary to glance at, so the Explanation block leads. */
export function KeyTakeawayCard({ takeaway }: { takeaway: string }) {
  return (
    <View testID="quiz-key-takeaway" style={styles.quizKeyTakeawayCard}>
      <Text style={styles.quizKeyTakeawayLabel}>KEY TAKEAWAY</Text>
      <Text style={styles.quizKeyTakeawayText}>{takeaway}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scorePercent: {
    fontFamily:   font.semibold,
    fontSize:     fontSize.xxl,
    color:        colors.brand,
    textAlign:    'center',
  },
  scoreFraction: {
    fontFamily:   font.regular,
    fontSize:     fontSize.base,
    color:        colors.textMuted,
    textAlign:    'center',
    marginTop:    spacing.xs,
    marginBottom: spacing.xl,
  },
  trackAverageValueRow: {
    flexDirection: 'row',
    alignItems:    'center',
    justifyContent: 'center',
    gap:           spacing.xs,
  },
  trackAverageBadge: {
    fontFamily: font.semibold,
    fontSize:   fontSize.lg,
  },
  trackAverageUp:   { color: colors.success },
  trackAverageDown: { color: colors.error },
  trackAverageFlat: { color: colors.success },
  streakRow: {
    flexDirection:  'row',
    justifyContent: 'center',
    marginBottom:   spacing.md,
  },
  streakText: {
    fontFamily: font.semibold,
    fontSize:   fontSize.base,
    color:      colors.textStrong,
  },
  xpChip: {
    alignSelf:         'center',
    backgroundColor:   colors.xpSoft,
    borderRadius:      radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.xs,
    marginBottom:      spacing.md,
  },
  xpChipText: {
    fontFamily: font.semibold,
    fontSize:   fontSize.sm,
    color:      colors.xp,
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
  quizKeyTakeawayCard: {
    backgroundColor: colors.surface,
    borderRadius:    radius.card,
    padding:         spacing.md,
    marginBottom:    spacing.md,
    gap:             spacing.xs,
  },
  quizKeyTakeawayLabel: {
    fontFamily:    font.semibold,
    fontSize:      fontSize.xs,
    color:         colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quizKeyTakeawayText: {
    fontFamily: font.medium,
    fontSize:   fontSize.sm,
    color:      colors.textBody,
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
