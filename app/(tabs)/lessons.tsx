import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, font, fontSize, spacing } from '@/theme';
import { Button } from '@/components/ui/Button';
import { usePaths, useRefreshPaths, useSkip, useTopicFeedback } from '@/hooks/useTrack';
import { TopicFeedback } from '@/components/ui/TopicFeedback';
import { extractError } from '@/lib/errors';
import { useProgress } from '@/hooks/useProgress';
import { NoTrackNotice } from '@/components/ui/NoTrackNotice';
import { PathCard } from '@/components/ui/PathCard';
import { Ring } from '@/components/ui/Ring';
import { PathEndSection } from '@/components/albert/PathEndSection';
import { useCurrentUser } from '@/hooks/useEmailVerification';
import { PAYWALL_ROUTE } from '@/lib/subscriptions';
import { PATHS_LOAD_ERROR } from '@learning/shared';
import { TRACKS_ROUTE, lessonRoute } from '@/lib/routes';

/** The streak banner shows from this many days on. */
const STREAK_BANNER_AFTER_DAYS = 3;
/** The streak ring fills over this many days; there is no target, so it is only a scale. */
const STREAK_RING_DAYS = 30;

function streakCopy(streak: number): string {
  if (streak === 0) return 'Complete a lesson today to start your streak';
  if (streak <= 2) return "You're building a habit — keep going!";
  if (streak <= 6) return `You're on a ${streak}-day streak — don't break it!`;
  if (streak <= 29) return `Impressive — ${streak} days in a row!`;
  return `You're on fire — ${streak}-day streak!`;
}

export default function LessonsScreen() {
  const { data: paths, isError: pathsFailed } = usePaths();
  const { data: progress } = useProgress();
  const { data: user } = useCurrentUser();
  const router = useRouter();
  const skip = useSkip();
  const topicFeedback = useTopicFeedback();
  const refreshPaths = useRefreshPaths();

  // Active path is authoritative from the server (ADR-009 C2 + C11) — no client derivation.
  const activePath = paths?.find(p => p.isActive);
  const hasNoContent = Array.isArray(paths) && paths.length === 0;
  // User has paths but none active (e.g. completed their active path or archived it).
  // Show the most recent path (paths[0] — server ordered by recency, C2) with a next-path CTA.
  const lastPath = activePath ? undefined : paths?.[0];
  // The server shows one screen per topic (079d): the first path carrying a topicEnd is the one.
  const topicEnd = paths?.find(p => p.topicEnd)?.topicEnd ?? null;
  // A finished Albert path asks what's next (079i3), after any topic end. `isFinished` is the server's
  // word; the path shown is the active one, or the most recent when none is active.
  const shownPath = activePath ?? lastPath;
  const pathEnd = !topicEnd && shownPath?.kind === 'custom' && shownPath.isFinished ? shownPath : null;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* First thing on the screen — 069 items 1+2. It used to render below the
            streak hero and the stats row, so a brand-new user met a wall of zeros
            before reaching the one action available to them. */}
        {hasNoContent && <NoTrackNotice />}
        {pathsFailed && (
          <Text testID="paths-load-error" style={styles.loadError}>{PATHS_LOAD_ERROR}</Text>
        )}

        {progress && !hasNoContent && progress.currentStreak > STREAK_BANNER_AFTER_DAYS && (
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
            Value normalised against STREAK_RING_DAYS so the ring fills gradually. */}
        {progress && !hasNoContent && (
          <View testID="streak-hero" style={styles.streakHero}>
            <Ring
              value={Math.min(100, (progress.currentStreak / STREAK_RING_DAYS) * 100)}
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

        {/* A failed skip says so (079c refactor R1: it used to stop the spinner and show nothing). */}
        {skip.error && (
          <Text testID="skip-error" style={styles.loadError}>{extractError(skip.error)}</Text>
        )}

        {/* End-of-topic feedback (079d). Closing refetches paths, so a written answer comes back
            as topicEnd: null and the path card below never changes in response to it. */}
        {topicEnd && (
          <TopicFeedback
            key={`${topicEnd.planId}:${topicEnd.stableKey}`}
            topicEnd={topicEnd}
            onSubmit={body => topicFeedback.submit(topicEnd.planId, body)}
            onClose={() => { refreshPaths(); }}
          />
        )}

        {pathEnd && user && (
          <PathEndSection path={pathEnd} locked={!user.isPremium} onUpgrade={() => router.push(PAYWALL_ROUTE)} />
        )}

        {/* Active path — the one path card Home shows (076g §1). */}
        {activePath && (
          <PathCard
            path={activePath}
            onStartLesson={id => router.push(lessonRoute(id))}
            onSkip={skip.skip}
            skipPending={skip.pendingScope(activePath)}
          />
        )}

        {/* No active path but paths exist — show the last path + next-path CTA (076g §1).
            NoTrackNotice is wrong here: the user has history, just no active path. */}
        {lastPath && (
          <>
            <PathCard
              path={lastPath}
              onStartLesson={id => router.push(lessonRoute(id))}
              onSkip={skip.skip}
              skipPending={skip.pendingScope(lastPath)}
            />
            <Button
              testID="choose-next-path-btn"
              label="Choose your next path →"
              variant="outline"
              onPress={() => router.push(TRACKS_ROUTE)}
            />
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  loadError: {
    fontFamily: font.regular,
    fontSize: fontSize.base,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
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
});
