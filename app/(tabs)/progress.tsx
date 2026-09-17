import { View, Text, StyleSheet, ScrollView, Pressable, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { TrackEnrollmentWithProgress } from '@learning/shared';
import { colors, font, fontSize, radius, spacing } from '@/theme';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { useProgress } from '@/hooks/useProgress';
import { useEnrollments } from '@/hooks/useTrack';
import { useXp } from '@/hooks/useXp';
import { Progress } from '@/components/ui/Progress';
import { TrackMap } from '@/components/ui/TrackMap';
import { NoTrackNotice } from '@/components/ui/NoTrackNotice';
import { FlameIcon } from '@/components/ui/Streak';

// ── Helpers ──────────────────────────────────────────────────────────────────

function flooredPct(enrollment: TrackEnrollmentWithProgress): number {
  return enrollment.completedLessons > 0
    ? Math.max(1, Math.round(enrollment.percentComplete))
    : 0;
}

function trackMotivation(enrollment: TrackEnrollmentWithProgress, pct: number): string {
  const lessonsLeft = enrollment.totalLessons - enrollment.completedLessons;
  if (lessonsLeft <= 20) return `Only ${lessonsLeft} lessons to complete ${enrollment.skill.name}!`;
  return `You're ${pct}% through ${enrollment.skill.name} — keep going!`;
}

/** Prefer capstone score; fall back to track average; null if neither. */
function completedScore(e: TrackEnrollmentWithProgress): number | null {
  return e.capstoneScore ?? e.averageScore ?? null;
}

function formatDuration(enrolledAt: Date | string, completedAt: Date | string): string {
  const days = Math.max(
    1,
    Math.round((+new Date(completedAt as string) - +new Date(enrolledAt as string)) / 86400000),
  );
  if (days >= 14) return `${Math.round(days / 7)} weeks`;
  return `${days} day${days > 1 ? 's' : ''}`;
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const router = useRouter();
  const { data, isLoading, isError } = useProgress();
  const { data: enrollmentsData } = useEnrollments();
  const { data: xpData } = useXp();

  const activeEnrollments: TrackEnrollmentWithProgress[] =
    enrollmentsData?.filter(e => e.percentComplete < 100) ?? [];
  const completedEnrollments: TrackEnrollmentWithProgress[] =
    enrollmentsData?.filter(e => e.percentComplete >= 100) ?? [];
  const hasNoEnrollments = Array.isArray(enrollmentsData) && enrollmentsData.length === 0;

  return (
    <SafeAreaView style={styles.container}>
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

        {/* ── Active tracks ─────────────────────────────────────────────── */}
        {activeEnrollments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Active Tracks</Text>
            {activeEnrollments.map(e => {
              const pct = flooredPct(e);
              return (
                <Card key={e.skillId} testID={`enrollment-card-${e.skillId}`} style={styles.enrollmentCard}>
                  <View style={styles.enrollmentHeader}>
                    <Text style={styles.enrollmentTitle}>{e.skill.name}</Text>
                    <Text style={styles.pctText}>{pct}% complete</Text>
                  </View>
                  <Text style={styles.motivationText}>{trackMotivation(e, pct)}</Text>
                  <Text style={styles.lessonsCount}>
                    {e.completedLessons} of {e.totalLessons} lessons complete
                  </Text>
                  {e.levels && e.levels.length > 0 && (
                    <TrackMap levels={e.levels} />
                  )}
                </Card>
              );
            })}
          </View>
        )}

        {/* ── Completed tracks ──────────────────────────────────────────── */}
        {completedEnrollments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Completed Tracks</Text>
            {completedEnrollments.map(e => {
              const score = completedScore(e);
              return (
                <Card key={e.skillId} testID={`completed-card-${e.skillId}`} style={styles.completedCard}>
                  <View style={styles.completedHeader}>
                    <Text style={[styles.enrollmentTitle, styles.completedTitle]}>{e.skill.name}</Text>
                    <Badge label="Terminus" variant="success" />
                  </View>

                  <View style={styles.completedMeta}>
                    {e.completedAt && (
                      <Text testID={`completed-date-${e.skillId}`} style={styles.completedMetaText}>
                        {new Date(e.completedAt as unknown as string).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </Text>
                    )}
                    {e.completedAt && e.enrolledAt && (
                      <Text style={styles.completedMetaText}>
                        {' '}· {formatDuration(e.enrolledAt as unknown as string, e.completedAt as unknown as string)}
                      </Text>
                    )}
                    <Text style={styles.completedMetaText}>
                      {' '}· {e.totalLessons} of {e.totalLessons} lessons
                    </Text>
                  </View>

                  {score !== null && (
                    <Text style={styles.completedScore}>{Math.round(score)}%</Text>
                  )}

                  <View style={styles.completedActions}>
                    <Pressable
                      testID={`completed-next-track-${e.skillId}`}
                      style={styles.completedActionBtn}
                      onPress={() => router.push('/(tabs)/tracks')}
                    >
                      <Text style={styles.completedActionText}>Find next track →</Text>
                    </Pressable>
                    <Pressable
                      testID={`completed-share-${e.skillId}`}
                      style={styles.completedShareBtn}
                      onPress={() =>
                        Share.share({
                          message: `I just completed "${e.skill.name}" on Ascent! 🎉`,
                        })
                      }
                    >
                      <Text style={styles.completedShareText}>Share</Text>
                    </Pressable>
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        {hasNoEnrollments && (
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

  // ── Active enrollment cards ───────────────────────────────────────────────
  section: {
    gap:          spacing.sm,
    marginBottom: spacing.md,
  },
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

  // ── Completed track cards ─────────────────────────────────────────────────
  completedCard: {
    gap: spacing.sm,
  },
  completedHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  completedTitle: {
    flex: 1,
  },
  completedMeta: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    alignItems:     'center',
  },
  completedMetaText: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
  },
  completedScore: {
    fontFamily: font.bold,
    fontSize:   fontSize.lg,
    color:      colors.brand,
  },
  completedActions: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    gap:            spacing.sm,
    marginTop:      spacing.xs,
  },
  completedActionBtn: {
    flex:            1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.brand,
    borderRadius:    radius.btn,
    alignItems:      'center',
  },
  completedActionText: {
    fontFamily: font.semibold,
    fontSize:   fontSize.sm,
    color:      colors.onBrand,
  },
  completedShareBtn: {
    paddingVertical:   spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius:      radius.btn,
    borderWidth:       1,
    borderColor:       colors.border,
    alignItems:        'center',
  },
  completedShareText: {
    fontFamily: font.semibold,
    fontSize:   fontSize.sm,
    color:      colors.textStrong,
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
