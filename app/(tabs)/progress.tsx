import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text } from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { PATHS_LOAD_ERROR, PROGRESS_LOAD_ERROR, isProgressComplete, type UserPath } from '@learning/shared';
import { colors, font, fontSize, spacing } from '@/theme';
import { TAB_BAR_CLEARANCE, TAB_SCREEN_EDGES } from '@/lib/safeArea';
import { Spinner } from '@/components/ui/Spinner';
import { useProgress } from '@/hooks/useProgress';
import { usePaths } from '@/hooks/useTrack';
import { usePrefetchNextScreens } from '@/hooks/usePrefetchNextScreens';
import { AltitudeSection } from '@/components/altitude/AltitudeSection';
import { sectionHeadingStyle } from '@/components/ui/sectionHeading';
import { FlameIcon } from '@/components/ui/Streak';
import { PathProgress } from '@/components/ui/PathProgress';
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

// Side gutters (the board's 24).
const PROGRESS_GUTTER = spacing.lg;
/** The gap between the page's blocks. */
const BLOCK_GAP = 22;

// ── Screen ───────────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const router = useRouter();
  const { data, isLoading, isError } = useProgress();
  const { data: paths, isError: pathsFailed } = usePaths();
  usePrefetchNextScreens('progress', paths);

  // Split by state, never by kind (ADR-009 C16) — a custom path belongs in Progress
  // exactly as a track does. The user-wide stats above already counted its lessons,
  // because they are computed over UserProgress rows.
  const inProgress: UserPath[] = paths?.filter(p => !isProgressComplete(p)) ?? [];
  const completed: UserPath[] = paths?.filter(isProgressComplete) ?? [];

  return (
    <SafeAreaView style={styles.container} edges={TAB_SCREEN_EDGES}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_CLEARANCE }]}>
        {isLoading && <Spinner fullScreen />}

        {isError && (
          <Text style={styles.error}>{PROGRESS_LOAD_ERROR}</Text>
        )}

        {pathsFailed && (
          <Text testID="paths-load-error" style={styles.error}>{PATHS_LOAD_ERROR}</Text>
        )}

        {!isLoading && !isError && data === null && (
          <Text style={styles.empty}>No progress data available.</Text>
        )}

        {data && (
          <>
            {/* Hero: the level and the metres toward the next. No box: it sits on the page. */}
            <AltitudeSection screen="progress" opens="level" trailing={null} />

            {/* The three numbers, as one quiet row. */}
            <View testID="progress-stats" style={styles.statsRow}>
              <View style={styles.stat}>
                <Text testID="progress-lessons-count" style={styles.statValue}>{data.totalLessonsCompleted}</Text>
                <Text style={styles.statLabel}>Lessons</Text>
              </View>
              <View style={[styles.stat, styles.statDivided]}>
                <Text testID="progress-avg-score" style={styles.statValue}>{Math.round(data.averageScore)}%</Text>
                <Text style={styles.statLabel}>Avg quiz score</Text>
              </View>
              <View style={[styles.stat, styles.statDivided]}>
                <View style={styles.statValueRow}>
                  <FlameIcon size={fontSize.lg} />
                  <Text testID="progress-streak" style={styles.statValue}>{data.currentStreak}</Text>
                </View>
                <Text style={styles.statLabel}>Day streak</Text>
              </View>
            </View>
          </>
        )}

        {inProgress.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>{inProgress.length === 1 ? 'Your path' : 'Your paths'}</Text>
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
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content:   { paddingHorizontal: PROGRESS_GUTTER, paddingTop: spacing.sm, gap: BLOCK_GAP, flexGrow: 1 },

  // ── Quiet stats row ───────────────────────────────────────────────────────
  statsRow: {
    flexDirection:     'row',
    borderTopWidth:    1,
    borderBottomWidth: 1,
    borderColor:       colors.border,
  },
  // Every column is left-aligned, with the same padding from its rule.
  stat: {
    flex:            1,
    paddingVertical: 14,
    gap:             spacing.xs,
    paddingLeft:     spacing.sm3,
  },
  statDivided: {
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statValue: {
    fontFamily:    font.black,
    fontSize:      fontSize.xl + 2,
    letterSpacing: -0.035 * (fontSize.xl + 2),
    color:         colors.textStrong,
  },
  statLabel: {
    fontFamily: font.semibold,
    fontSize:   fontSize.xs,
    color:      colors.textMuted,
  },

  // ── Section headings ──────────────────────────────────────────────────────
  sectionHeading: sectionHeadingStyle,

  // ── Path sections ─────────────────────────────────────────────────────────
  section: { gap: spacing.sm3 },

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
