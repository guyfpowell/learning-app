import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { UserPath } from '@learning/shared';
import { colors, font, fontSize, spacing } from '@/theme';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { useProgress } from '@/hooks/useProgress';
import { usePaths, useTrackContents } from '@/hooks/useTrack';
import { useXp } from '@/hooks/useXp';
import { Progress } from '@/components/ui/Progress';
import { PathProgress } from '@/components/ui/PathProgress';
import { NoTrackNotice } from '@/components/ui/NoTrackNotice';
import { FlameIcon } from '@/components/ui/Streak';
import { TrackContentsTree } from '@/components/learning/TrackContentsTree';

// ── Expandable path card — wraps PathProgress + lazily-loaded tree ────────────

function ExpandablePathCard({ path, onFindNext }: { path: UserPath; onFindNext: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const { data: contents, isLoading: treeLoading } = useTrackContents(
    path.kind,
    path.id,
    { enabled: expanded },
  );

  // Derive initial expand targets from the server's isCurrent markers.
  // An empty object (no isCurrent group) means fully collapsed — correct for 100% paths.
  const initialExpanded = useMemo(() => {
    if (!contents) return undefined;
    const currentGroup = contents.groups.find(g => g.isCurrent);
    if (!currentGroup) return undefined;
    const currentTopic = currentGroup.topics.find(t => t.isCurrent);
    return { groupKey: currentGroup.key, topicKey: currentTopic?.key };
  }, [contents]);

  return (
    <View>
      <PathProgress path={path} onFindNext={onFindNext} />
      <Pressable
        testID={`path-expand-btn-${path.id}`}
        onPress={() => setExpanded(e => !e)}
        style={styles.expandToggle}
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Collapse lesson tree' : 'Expand lesson tree'}
        accessibilityState={{ expanded }}
        hitSlop={{ top: 4, bottom: 4 }}
      >
        <Text style={styles.expandLabel}>{expanded ? 'Hide lessons' : 'Show lessons'}</Text>
        <Text style={styles.expandChevron}>{expanded ? '▾' : '▸'}</Text>
      </Pressable>

      {expanded && (
        <>
          {treeLoading && <Spinner testID={`tree-loading-${path.id}`} />}
          {!treeLoading && contents && (
            <TrackContentsTree contents={contents} initialExpanded={initialExpanded} />
          )}
        </>
      )}
    </View>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const router = useRouter();
  const { data, isLoading, isError } = useProgress();
  const { data: paths } = usePaths();
  const { data: xpData } = useXp();

  // Split by state, never by kind (ADR-009 C16) — a custom path belongs in Progress
  // exactly as a track does. The user-wide stats above already counted its lessons,
  // because they are computed over UserProgress rows.
  const inProgress: UserPath[] = paths?.filter(p => p.percentComplete < 100) ?? [];
  const completed: UserPath[] = paths?.filter(p => p.percentComplete >= 100) ?? [];
  const hasNoPaths = Array.isArray(paths) && paths.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>My Progress</Text>

        {isLoading && <Spinner fullScreen />}

        {isError && (
          <Text style={styles.error}>Unable to load progress. Please try again.</Text>
        )}

        {!isLoading && !isError && data === null && (
          <Text style={styles.empty}>No progress data available.</Text>
        )}

        {data && (
          <>
            {/* Hero stat — streak */}
            <Card testID="progress-streak-card" style={styles.heroCard}>
              <View style={styles.heroInner}>
                <FlameIcon size={28} />
                <Text testID="progress-streak" style={styles.heroValue}>{data.currentStreak}</Text>
              </View>
              <Text style={styles.heroLabel}>Day Streak</Text>
            </Card>

            {/* Subordinate stats */}
            <View style={styles.statsRow}>
              <Card style={styles.statCard}>
                <Text testID="progress-lessons-count" style={styles.statValue}>{data.totalLessonsCompleted}</Text>
                <Text style={styles.statLabel}>Lessons Done</Text>
              </Card>
              <Card style={styles.statCard}>
                <Text testID="progress-avg-score" style={styles.statValue}>{Math.round(data.averageScore)}%</Text>
                <Text style={styles.statLabel}>Avg Score</Text>
              </Card>
            </View>

            {xpData && (
              <Card testID="xp-card" style={styles.xpCard}>
                <View style={styles.xpHeader}>
                  <Text testID="xp-total" style={styles.xpTotal}>{xpData.totalXp.toLocaleString()} XP</Text>
                  {xpData.tier ? (
                    <Text testID="xp-tier-label" style={styles.xpTierLabel}>{xpData.tier.label}</Text>
                  ) : xpData.nextMilestone ? (
                    <Text testID="xp-next-label" style={styles.xpNextLabel}>
                      {xpData.nextMilestone.name} in {xpData.nextMilestone.xpRemaining.toLocaleString()} XP
                    </Text>
                  ) : null}
                </View>
                {xpData.tier ? (
                  <>
                    <Text testID="xp-level-hint" style={styles.xpNextLabel}>
                      {(xpData.tier.ceiling - xpData.totalXp).toLocaleString()} XP to next level
                    </Text>
                    <Progress
                      testID="xp-progress-bar"
                      value={Math.round(
                        ((xpData.totalXp - xpData.tier.floor) /
                          (xpData.tier.ceiling - xpData.tier.floor)) *
                          100,
                      )}
                      tone="xp"
                    />
                  </>
                ) : xpData.nextMilestone ? (
                  <Progress
                    testID="xp-progress-bar"
                    value={Math.round(
                      (xpData.totalXp / xpData.nextMilestone.xpRequired) * 100,
                    )}
                    tone="xp"
                  />
                ) : null}
              </Card>
            )}

            {data.lastLessonDate && (
              <Card style={styles.dateCard}>
                <Text style={styles.dateLabel}>
                  Last lesson:{' '}
                  {new Date(data.lastLessonDate as unknown as string).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              </Card>
            )}
          </>
        )}

        {inProgress.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Keep Going</Text>
            {inProgress.map(path => (
              <ExpandablePathCard
                key={`${path.kind}-${path.id}`}
                path={path}
                onFindNext={() => router.push('/(tabs)/tracks')}
              />
            ))}
          </View>
        )}

        {completed.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Completed</Text>
            {completed.map(path => (
              <ExpandablePathCard
                key={`${path.kind}-${path.id}`}
                path={path}
                onFindNext={() => router.push('/(tabs)/tracks')}
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

  heading: {
    fontFamily:   font.semibold,
    fontSize:     fontSize.xl,
    color:        colors.textStrong,
    marginBottom: spacing.lg,
  },

  // ── Hero stat (streak) ────────────────────────────────────────────────────
  heroCard: {
    alignItems:   'center',
    paddingVertical: spacing.lg,
    marginBottom: spacing.sm,
  },
  heroInner: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.xs,
  },
  heroValue: {
    fontFamily: font.bold,
    fontSize:   fontSize.xl,
    color:      colors.brand,
  },
  heroLabel: {
    fontFamily:  font.regular,
    fontSize:    fontSize.sm,
    color:       colors.textMuted,
    marginTop:   spacing.xs,
    textAlign:   'center',
  },

  // ── Subordinate stats ─────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    gap:           spacing.sm,
    marginBottom:  spacing.md,
  },
  statCard: {
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

  // ── XP card ───────────────────────────────────────────────────────────────
  xpCard: {
    gap:          spacing.sm,
    marginBottom: spacing.sm,
  },
  xpHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'baseline',
    flexWrap:       'wrap',
    gap:            spacing.xs,
  },
  xpTotal: {
    fontFamily: font.bold,
    fontSize:   fontSize.lg,
    color:      colors.xp,
  },
  xpNextLabel: {
    fontFamily: font.regular,
    fontSize:   fontSize.xs,
    color:      colors.textMuted,
  },
  xpTierLabel: {
    fontFamily: font.semibold,
    fontSize:   fontSize.xs,
    color:      colors.xp,
  },

  // ── Last lesson card ──────────────────────────────────────────────────────
  dateCard: { marginBottom: spacing.sm },
  dateLabel: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
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

  // ── Expand toggle row (beneath each PathProgress card) ────────────────────
  expandToggle: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'flex-end',
    paddingVertical:   spacing.xs,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  expandLabel: {
    fontFamily: font.regular,
    fontSize:   fontSize.xs,
    color:      colors.textMuted,
  },
  expandChevron: {
    fontFamily: font.regular,
    fontSize:   fontSize.xs,
    color:      colors.textMuted,
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
