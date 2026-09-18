import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, font, fontSize, spacing } from '@/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { usePaths, useSkipTopic, useSkipLevel } from '@/hooks/useTrack';
import { useProgress } from '@/hooks/useProgress';
import type { UserPath } from '@learning/shared';
import { NoTrackNotice } from '@/components/ui/NoTrackNotice';
import { PathCard } from '@/components/ui/PathCard';
import { Ring } from '@/components/ui/Ring';

function streakCopy(streak: number): string {
  if (streak === 0) return 'Complete a lesson today to start your streak';
  if (streak <= 2) return "You're building a habit — keep going!";
  if (streak <= 6) return `You're on a ${streak}-day streak — don't break it!`;
  if (streak <= 29) return `Impressive — ${streak} days in a row!`;
  return `You're on fire — ${streak}-day streak!`;
}


export default function LessonsScreen() {
  const { data: paths } = usePaths();
  const { data: progress } = useProgress();
  const router = useRouter();
  const skipTopic = useSkipTopic();
  const skipLevel = useSkipLevel();

  // Split by state, never by kind (ADR-009 C16). The server already ordered paths
  // active-first then by most recent progress, so no re-sorting here.
  const inProgress: UserPath[] = paths?.filter(p => p.percentComplete < 100) ?? [];
  const completed: UserPath[] = paths?.filter(p => p.percentComplete >= 100) ?? [];
  const hasNoContent = Array.isArray(paths) && paths.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* First thing on the screen — 069 items 1+2. It used to render below the
            streak hero and the stats row, so a brand-new user met a wall of zeros
            before reaching the one action available to them. */}
        {hasNoContent && <NoTrackNotice />}

        {progress && !hasNoContent && progress.currentStreak > 3 && (
          <View testID="streak-banner" style={styles.streakBanner}>
            <Text style={styles.streakBannerText}>
              {'You\'re on a '}
              <Text style={styles.streakBannerBold}>{progress.currentStreak}-day streak</Text>
              {' — keep it alive!'}
            </Text>
          </View>
        )}

        {/* Streak hero — 069 A9.
            Ring re-tasks the kit's daily-goal ring to show the streak count.
            No target, no denominator, no "X of Y" — streak presence only.
            Value normalised against 30 days so the ring fills gradually. */}
        {progress && !hasNoContent && (
          <View testID="streak-hero" style={styles.streakHero}>
            <Ring
              value={Math.min(100, (progress.currentStreak / 30) * 100)}
              size={84}
              stroke={9}
              label={String(progress.currentStreak)}
            />
            <View style={styles.streakHeroText}>
              <Text style={styles.streakHeroLabel}>Day streak</Text>
              <Text style={styles.streakHeroCopy}>{streakCopy(progress.currentStreak)}</Text>
            </View>
          </View>
        )}

        {inProgress.length > 0 && (
          <View style={styles.section}>
            {/* "Tracks" would be wrong now: this is every path the user is on,
                custom ones included, each through the same card. */}
            <Text style={styles.sectionHeading}>Keep Going</Text>
            {inProgress.map(path => (
              <PathCard
                key={`${path.kind}-${path.id}`}
                path={path}
                onStartLesson={id => router.push(`/(tabs)/lesson/${id}`)}
                onSkipTopic={p => skipTopic.mutate({ kind: p.kind, id: p.id })}
                onSkipLevel={p => skipLevel.mutate({ kind: p.kind, id: p.id })}
                skipTopicPending={skipTopic.isPending}
                skipLevelPending={skipLevel.isPending}
              />
            ))}
          </View>
        )}

        {completed.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Completed</Text>
            {completed.map(path => (
              <Card key={`${path.kind}-${path.id}`} testID={`completed-card-${path.id}`} style={styles.completedCard}>
                <Text style={styles.enrollmentTitle}>{path.name}</Text>
                <Badge label="Completed" variant="success" />
              </Card>
            ))}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content:   { padding: spacing.md, flexGrow: 1 },

  // ── Streak hero (069 A9) ─────────────────────────────────────────────────
  // Replaces the old streak card — ring + label + copy, row layout matching the kit.
  streakHero: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            spacing.lg,
    marginBottom:   spacing.md,
    padding:        spacing.md,
    backgroundColor: colors.surface,
    borderRadius:   16,
  },
  streakHeroText: {
    flex: 1,
    gap:  spacing.xs,
  },
  streakHeroLabel: {
    fontFamily: font.semibold,
    fontSize:   fontSize.base,
    color:      colors.textStrong,
  },
  streakHeroCopy: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
  },

  // ── Streak banner ────────────────────────────────────────────────────────
  streakBanner: {
    padding:         spacing.sm,
    backgroundColor: colors.coralSoft,
    borderRadius:    8,
    borderWidth:     1,
    borderColor:     colors.coral + '40',
    marginBottom:    spacing.sm,
  },
  streakBannerText: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.coral,
  },
  streakBannerBold: {
    fontFamily: font.semibold,
  },

  // ── Sections ─────────────────────────────────────────────────────────────
  section: {
    gap:          spacing.sm,
    marginBottom: spacing.md,
  },
  sectionHeading: {
    fontFamily: font.semibold,
    fontSize:   fontSize.base,
    color:      colors.textStrong,
  },

  // ── Enrollment card ───────────────────────────────────────────────────────
  enrollmentCard: {
    gap: spacing.sm,
  },
  enrollmentHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
  },
  enrollmentTitle: {
    fontFamily: font.semibold,
    fontSize:   fontSize.base,
    color:      colors.textStrong,
    flex:       1,
  },
  pctText: {
    fontFamily: font.medium,
    fontSize:   fontSize.sm,
    color:      colors.brand,
  },
  progressTrack: {
    height:          6,
    backgroundColor: colors.borderSubtle,
    borderRadius:    3,
    overflow:        'hidden',
  },
  progressFill: {
    height:          6,
    backgroundColor: colors.brand,
    borderRadius:    3,
  },
  motivationText: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
  },
  lessonsCount: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
  },

  // ── Next lesson card ──────────────────────────────────────────────────────
  nextLessonCard: {
    gap: spacing.sm,
  },
  nextLessonTrackName: {
    fontFamily:    font.medium,
    fontSize:      fontSize.xs,
    color:         colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nextLessonSummary: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
    fontStyle:  'italic',
  },
  nextLessonTitle: {
    fontFamily: font.medium,
    fontSize:   fontSize.sm,
    color:      colors.textStrong,
  },
  nextLessonMeta: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
    flexWrap:      'wrap',
  },
  positionLabel: {
    fontFamily: font.regular,
    fontSize:   fontSize.xs,
    color:      colors.textMuted,
  },
  noNextLesson: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
    fontStyle:  'italic',
  },
  continueBtn: {
    marginTop: spacing.xs,
  },
  skipBtn: {
    marginTop: spacing.xs,
  },

  // ── Completed card ────────────────────────────────────────────────────────
  completedCard: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
});
