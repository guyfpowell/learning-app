import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, font, fontSize, spacing } from '@/theme';
import { TAB_BAR_CLEARANCE, TAB_SCREEN_EDGES } from '@/lib/safeArea';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { skippedMessage } from '@/lib/skipToast';
import { usePaths, useRefreshPaths, useSkip, useTopicFeedback } from '@/hooks/useTrack';
import { TopicFeedback } from '@/components/ui/TopicFeedback';
import { extractError } from '@/lib/errors';
import { useProgress } from '@/hooks/useProgress';
import { NewUserHome } from '@/components/home/NewUserHome';
import { PathCard } from '@/components/ui/PathCard';
import { HomePath } from '@/components/home/HomePath';
import { MomentumCard } from '@/components/home/MomentumCard';
import { PathEndSection } from '@/components/albert/PathEndSection';
import { useCurrentUser } from '@/hooks/useEmailVerification';
import { PAYWALL_ROUTE } from '@/lib/subscriptions';
import { PATHS_LOAD_ERROR, type SkipReason, type SkipScope, type UserPath } from '@learning/shared';
import { TRACKS_ROUTE, lessonRoute, trackRoute } from '@/lib/routes';

/** Home's side gutters (the design's 20: there is no 20 token). */
const HOME_GUTTER = spacing.md + spacing.xs;

/** How long the skip toast stays. */
const SKIP_TOAST_MS = 3000;

/** The streak banner shows from this many days on. */
const STREAK_BANNER_AFTER_DAYS = 3;
export default function LessonsScreen() {
  const { data: paths, isError: pathsFailed } = usePaths();
  const { data: progress } = useProgress();
  const { data: user } = useCurrentUser();
  const router = useRouter();
  const skip = useSkip();
  const topicFeedback = useTopicFeedback();
  const refreshPaths = useRefreshPaths();
  // "Lesson 2 skipped": shown once the server has taken the skip, then clears itself.
  const [skipToast, setSkipToast] = useState<string | null>(null);
  useEffect(() => {
    if (!skipToast) return;
    const timer = setTimeout(() => setSkipToast(null), SKIP_TOAST_MS);
    return () => clearTimeout(timer);
  }, [skipToast]);
  const onSkip = (path: UserPath, scope: SkipScope, reason: SkipReason) => {
    const message = skippedMessage(path, scope);
    skip.skip(path, scope, reason, () => setSkipToast(message));
  };

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
    <SafeAreaView style={styles.container} edges={TAB_SCREEN_EDGES}>
      <ScrollView contentContainerStyle={[hasNoContent ? styles.contentBleed : styles.content, { paddingBottom: TAB_BAR_CLEARANCE }]} automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">

        {/* First thing on the screen — 069 items 1+2. It used to render below the
            streak hero and the stats row, so a brand-new user met a wall of zeros
            before reaching the one action available to them. */}
        {hasNoContent && <NewUserHome />}
        {pathsFailed && (
          <Text testID="paths-load-error" style={styles.loadError}>{PATHS_LOAD_ERROR}</Text>
        )}

        {progress && !hasNoContent && progress.currentStreak > STREAK_BANNER_AFTER_DAYS && (
          <View testID="streak-banner" style={styles.streakBanner}>
            <Text style={styles.streakBannerText}>
              {'You\'re on a '}
              <Text style={styles.streakBannerBold}>{progress.currentStreak}-day streak</Text>
              {'. Keep it alive!'}
            </Text>
          </View>
        )}

        {/* Momentum — the streak, XP and one achievement: a reason to keep going. */}
        {progress && !hasNoContent && <MomentumCard streak={progress.currentStreak} />}

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
          <HomePath
            path={activePath}
            onOpen={() => router.push(trackRoute(activePath.kind, activePath.id))}
            onStartLesson={id => router.push(lessonRoute(id))}
            onSkip={onSkip}
            skipPending={skip.pendingScope(activePath)}
          />
        )}

        {/* No active path but paths exist — show the last path + next-path CTA (076g §1).
            NoTrackNotice is wrong here: the user has history, just no active path. */}
        {lastPath && (
          <>
            <PathCard
              path={lastPath}
              onOpen={() => router.push(trackRoute(lastPath.kind, lastPath.id))}
              onStartLesson={id => router.push(lessonRoute(id))}
              onSkip={onSkip}
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

      {skipToast && (
        <View testID="skip-toast" style={styles.toast} pointerEvents="none">
          <Toast plain visible message={skipToast} />
        </View>
      )}
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
  content:   { padding: HOME_GUTTER, flexGrow: 1 },
  // The new-user page runs its colour block edge to edge and pads its own content.
  contentBleed: { flexGrow: 1 },
  // Floats above the tab bar, 16 in from each edge.
  toast:     { position: 'absolute', start: spacing.md, end: spacing.md, bottom: TAB_BAR_CLEARANCE },

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
