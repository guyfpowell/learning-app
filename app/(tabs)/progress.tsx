import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { PATHS_LOAD_ERROR, isProgressComplete, xpProgressOf, type UserPath } from '@learning/shared';
import { colors, font, fontSize, spacing } from '@/theme';
import { TAB_BAR_CLEARANCE, TAB_SCREEN_EDGES } from '@/lib/safeArea';
import { Spinner } from '@/components/ui/Spinner';
import { useProgress } from '@/hooks/useProgress';
import { usePaths } from '@/hooks/useTrack';
import { useXp } from '@/hooks/useXp';
import { Progress } from '@/components/ui/Progress';
import { PathProgress } from '@/components/ui/PathProgress';
import { NoTrackNotice } from '@/components/ui/NoTrackNotice';
import { AchievementsSection } from '@/components/achievements/AchievementsSection';
import { TRACKS_ROUTE, trackRoute } from '@/lib/routes';

// ── A path card that opens its detail (096) ─────────────────────────────────

function PathCardLink({ path, onOpen, onFindNext }: { path: UserPath; onOpen: () => void; onFindNext: () => void }) {
  return (
    <Pressable
      testID={`path-card-link-${path.id}`}
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`Open ${path.name}`}
    >
      <PathProgress path={path} onFindNext={onFindNext} />
    </Pressable>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const router = useRouter();
  const { data, isLoading, isError } = useProgress();
  const { data: paths, isError: pathsFailed } = usePaths();
  const { data: xpData } = useXp();
  const xpProgress = xpData ? xpProgressOf(xpData) : null;

  // Split by state, never by kind (ADR-009 C16) — a custom path belongs in Progress
  // exactly as a track does. The user-wide stats above already counted its lessons,
  // because they are computed over UserProgress rows.
  const inProgress: UserPath[] = paths?.filter(p => !isProgressComplete(p)) ?? [];
  const completed: UserPath[] = paths?.filter(isProgressComplete) ?? [];
  const hasNoPaths = Array.isArray(paths) && paths.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={TAB_SCREEN_EDGES}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_CLEARANCE }]}>
        {isLoading && <Spinner fullScreen />}

        {isError && (
          <Text style={styles.error}>Unable to load progress. Please try again.</Text>
        )}

        {pathsFailed && (
          <Text testID="paths-load-error" style={styles.error}>{PATHS_LOAD_ERROR}</Text>
        )}

        {!isLoading && !isError && data === null && (
          <Text style={styles.empty}>No progress data available.</Text>
        )}

        {data && (
          <>
            {/* Hero: the level and the XP toward the next (096). No box: it sits on the page. */}
            {xpProgress && xpData && (
              <View testID="xp-card" style={styles.xp}>
                <View style={styles.xpHeader}>
                  {xpProgress.kind === 'tier' ? (
                    <Text testID="xp-tier-label" style={styles.xpLevel}>{xpProgress.label}</Text>
                  ) : (
                    <Text style={styles.xpLevel}>XP</Text>
                  )}
                  <Text testID="xp-total" style={styles.xpTotal}>{xpData.totalXp.toLocaleString()} XP</Text>
                </View>
                {xpProgress.kind === 'milestone' && (
                  <Text testID="xp-next-label" style={styles.xpNextLabel}>
                    {xpProgress.name} in {xpProgress.xpRemaining.toLocaleString()} XP
                  </Text>
                )}
                {xpProgress.kind === 'tier' && (
                  <Text testID="xp-level-hint" style={styles.xpNextLabel}>
                    {xpProgress.xpToNext.toLocaleString()} XP to next level
                  </Text>
                )}
                {xpProgress.kind !== 'done' && (
                  <Progress testID="xp-progress-bar" value={xpProgress.percent} tone="xp" />
                )}
              </View>
            )}

            {/* The three numbers, as one quiet row. */}
            <View testID="progress-stats" style={styles.statsRow}>
              <View style={styles.stat}>
                <Text testID="progress-lessons-count" style={styles.statValue}>{data.totalLessonsCompleted}</Text>
                <Text style={styles.statLabel}>Lessons</Text>
              </View>
              <View style={styles.stat}>
                <Text testID="progress-avg-score" style={styles.statValue}>{Math.round(data.averageScore)}%</Text>
                <Text style={styles.statLabel}>Average quiz score</Text>
              </View>
              <View style={styles.stat}>
                <Text testID="progress-streak" style={styles.statValue}>{data.currentStreak}</Text>
                <Text style={styles.statLabel}>Day streak</Text>
              </View>
            </View>
          </>
        )}

        {inProgress.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Your path</Text>
            {inProgress.map(path => (
              <PathCardLink
                key={`${path.kind}-${path.id}`}
                path={path}
                onOpen={() => router.push(trackRoute(path.kind, path.id))}
                onFindNext={() => router.push(TRACKS_ROUTE)}
              />
            ))}
          </View>
        )}

        {data && <AchievementsSection />}

        {completed.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Completed</Text>
            {completed.map(path => (
              <PathCardLink
                key={`${path.kind}-${path.id}`}
                path={path}
                onOpen={() => router.push(trackRoute(path.kind, path.id))}
                onFindNext={() => router.push(TRACKS_ROUTE)}
              />
            ))}
          </View>
        )}

        {hasNoPaths && (
          <NoTrackNotice body="Your progress and track map appear here once you're on a track." />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content:   { padding: spacing.md, flexGrow: 1 },

  // ── XP hero ───────────────────────────────────────────────────────────────
  xp: {
    gap:          spacing.sm,
    marginBottom: spacing.lg,
  },
  xpHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'baseline',
    gap:            spacing.sm,
  },
  xpLevel: {
    fontFamily: font.display,
    fontSize:   fontSize.xl,
    color:      colors.textStrong,
  },
  xpTotal: {
    fontFamily: font.bold,
    fontSize:   fontSize.lg,
    color:      colors.xp,
  },
  xpNextLabel: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
  },

  // ── Quiet stats row ───────────────────────────────────────────────────────
  statsRow: {
    flexDirection:     'row',
    paddingVertical:   spacing.md,
    borderTopWidth:    1,
    borderBottomWidth: 1,
    borderColor:       colors.borderSubtle,
  },
  stat: {
    flex:       1,
    alignItems: 'center',
    gap:        spacing.xs,
  },
  statValue: {
    fontFamily: font.semibold,
    fontSize:   fontSize.lg,
    color:      colors.textStrong,
  },
  statLabel: {
    fontFamily: font.regular,
    fontSize:   fontSize.xs,
    color:      colors.textMuted,
    textAlign:  'center',
  },

  // ── Section headings ──────────────────────────────────────────────────────
  sectionHeading: {
    fontFamily:    font.semibold,
    fontSize:      fontSize.sm,
    color:         colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop:     spacing.lg,
    marginBottom:  spacing.sm,
  },

  // ── Path sections ─────────────────────────────────────────────────────────
  section: {
    gap:          spacing.sm,
    marginBottom: spacing.md,
  },

  // ── Error / empty ─────────────────────────────────────────────────────────
  error: {
    fontFamily: font.regular,
    fontSize:   fontSize.base,
    color:      colors.error,
    textAlign:  'center',
    marginTop:  spacing.lg,
  },
  empty: {
    fontFamily: font.regular,
    fontSize:   fontSize.base,
    color:      colors.textMuted,
    textAlign:  'center',
    marginTop:  spacing.lg,
  },
});
