import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors, font, fontSize, radius, spacing } from '@/theme';
import { FlameIcon } from '@/components/ui/Streak';

/** The milestone card's subtitle: a warm off-white on coral, not a theme token. */
const MILESTONE_SUBTEXT = '#fff7ed';
/** From this streak the milestone card says more than "Keep going!". */
const UNSTOPPABLE_STREAK = 30;

const STREAK_FLAME_SIZE = 44;

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

/** The count's font on the solid flame: heavy and round, so it reads like a badge. */
const SOLID_COUNT_FONT = font.display;
/** On the solid flame the count is this share of the flame's size, and sits this far down it. */
const SOLID_COUNT_SCALE = 0.44;
const SOLID_COUNT_DROP = 0.45;
const SOLID_COUNT_WIDTH = 0.6;

interface StreakFlameProps {
  streak: number;
  /** A filled coral flame with a large cobalt count on it. Default: an outline flame with a cobalt count. */
  solid?: boolean;
  size?: number;
}

/** The day streak: a flame with the count inside it. */
export function StreakFlame({ streak, solid = false, size = STREAK_FLAME_SIZE }: StreakFlameProps) {
  const box = { width: size, height: size };
  return (
    <View testID="streak-flame" accessibilityLabel={`${streak}-day streak`} style={[styles.streakFlame, box]}>
      <FlameIcon size={size} outline={!solid} />
      <View style={[styles.streakFlameCountBox, solid && { paddingTop: size * SOLID_COUNT_DROP }]}>
        <Text
          testID="streak-flame-count"
          style={solid ? [styles.streakFlameCount, styles.streakFlameCountSolid, { fontSize: size * SOLID_COUNT_SCALE, width: size * SOLID_COUNT_WIDTH }] : styles.streakFlameCount}
          numberOfLines={1}
          adjustsFontSizeToFit={solid}
        >
          {streak}
        </Text>
      </View>
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
    fontSize:     fontSize.lg,
    color:        colors.brand,
    textAlign:    'center',
  },
  scoreFraction: {
    fontFamily:   font.regular,
    fontSize:     fontSize.xs,
    color:        colors.textMuted,
    textAlign:    'center',
  },
  trackAverageValueRow: {
    flexDirection: 'row',
    alignItems:    'center',
    justifyContent: 'center',
    gap:           spacing.xs,
  },
  trackAverageBadge: {
    fontFamily: font.semibold,
    fontSize:   fontSize.base,
  },
  trackAverageUp:   { color: colors.success },
  trackAverageDown: { color: colors.error },
  trackAverageFlat: { color: colors.success },
  streakFlame: {
    alignItems:     'center',
    justifyContent: 'center',
  },
  // Fills the flame's box so the count is centred on it; the flame's body sits low, so it is nudged down.
  streakFlameCountBox: {
    position:       'absolute',
    top:            0,
    bottom:         0,
    left:           0,
    right:          0,
    alignItems:     'center',
    justifyContent: 'center',
    paddingTop:     spacing.md + spacing.xs,
    paddingRight:   spacing.xs / 2,
  },
  streakFlameCountSolid: {
    fontFamily: SOLID_COUNT_FONT,
    color:      colors.brand,
    textAlign:  'center',
  },
  streakFlameCount: {
    fontFamily: font.bold,
    fontSize:   fontSize.md,
    color:      colors.brand,
  },
  xpChip: {
    backgroundColor:   colors.xpSoft,
    borderRadius:      radius.pill,
    paddingHorizontal: spacing.sm3,
    paddingVertical:   spacing.xs,
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
