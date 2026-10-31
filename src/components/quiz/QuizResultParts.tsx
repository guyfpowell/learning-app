import React, { useRef, useState, type ComponentRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import type { ScreenRect } from '@/components/ui/CelebrationOverlay';
import { colors, font, fontSize, radius, spacing } from '@/theme';

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
        <Text style={styles.scorePercent}>{average !== null ? `${average}%` : 'n/a'}</Text>
        {arrow && <Text style={[styles.trackAverageBadge, styles[ARROW_STYLE[arrow]]]}>{arrow}</Text>}
      </View>
      <Text style={styles.scoreFraction}>Track Average</Text>
    </View>
  );
}

/** The XP award chip. It reports where it sits on the screen, so the XP animation can fly back onto it. */
export function XpAward({ xp, onMeasure }: { xp: number; onMeasure?: (rect: ScreenRect) => void }) {
  const ref = useRef<ComponentRef<typeof View>>(null);
  return (
    <View
      ref={ref}
      collapsable={false}
      testID="xp-chip"
      style={styles.xpChip}
      onLayout={() => ref.current?.measureInWindow((x, y, width, height) => onMeasure?.({ x, y, width, height }))}
    >
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

/** Recessive on purpose, and closed until asked for: the explanation leads, this is a summary to open if wanted. */
export function KeyTakeawayCard({ takeaway }: { takeaway: string }) {
  const [open, setOpen] = useState(false);
  return (
    <View testID="quiz-key-takeaway" style={styles.quizKeyTakeawayCard}>
      <Pressable
        testID="quiz-key-takeaway-toggle"
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel="Key takeaway"
        accessibilityState={{ expanded: open }}
        style={styles.quizKeyTakeawayHeader}
      >
        <Text style={styles.quizKeyTakeawayLabel}>KEY TAKEAWAY</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
      </Pressable>
      {open && <Text testID="quiz-key-takeaway-text" style={styles.quizKeyTakeawayText}>{takeaway}</Text>}
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
  quizKeyTakeawayHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    minHeight:      32,
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
