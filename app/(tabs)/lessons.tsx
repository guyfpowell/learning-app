import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, font, fontSize, spacing } from '@/theme';
import { Button } from '@/components/ui/Button';
import { usePaths, useSkipLesson, useSkipTopic, useSkipLevel } from '@/hooks/useTrack';
import { useProgress } from '@/hooks/useProgress';
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
  const skipLesson = useSkipLesson();
  const skipTopic = useSkipTopic();
  const skipLevel = useSkipLevel();

  // Active path is authoritative from the server (ADR-009 C2 + C11) — no client derivation.
  const activePath = paths?.find(p => p.isActive);
  const hasNoContent = Array.isArray(paths) && paths.length === 0;
  // User has paths but none active (e.g. completed their active path or archived it).
  // Show the most recent path (paths[0] — server ordered by recency, C2) with a next-path CTA.
  const noActivePath = Array.isArray(paths) && paths.length > 0 && !activePath;
  const lastPath = noActivePath ? paths![0] : undefined;

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

        {/* Active path — the one path card Home shows (076g §1). */}
        {activePath && (
          <PathCard
            path={activePath}
            onStartLesson={id => router.push(`/(tabs)/lesson/${id}`)}
            onSkipLesson={p => skipLesson.mutate({ kind: p.kind, id: p.id })}
            onSkipTopic={p => skipTopic.mutate({ kind: p.kind, id: p.id })}
            onSkipLevel={p => skipLevel.mutate({ kind: p.kind, id: p.id })}
            skipLessonPending={skipLesson.isPending}
            skipTopicPending={skipTopic.isPending}
            skipLevelPending={skipLevel.isPending}
          />
        )}

        {/* No active path but paths exist — show the last path + next-path CTA (076g §1).
            NoTrackNotice is wrong here: the user has history, just no active path. */}
        {noActivePath && lastPath && (
          <>
            <PathCard
              path={lastPath}
              onStartLesson={id => router.push(`/(tabs)/lesson/${id}`)}
              onSkipLesson={p => skipLesson.mutate({ kind: p.kind, id: p.id })}
              onSkipTopic={p => skipTopic.mutate({ kind: p.kind, id: p.id })}
              onSkipLevel={p => skipLevel.mutate({ kind: p.kind, id: p.id })}
              skipLessonPending={skipLesson.isPending}
              skipTopicPending={skipTopic.isPending}
              skipLevelPending={skipLevel.isPending}
            />
            <Button
              testID="choose-next-path-btn"
              label="Choose your next path →"
              variant="outline"
              onPress={() => router.push('/(tabs)/tracks')}
            />
          </>
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
