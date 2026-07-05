import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { LessonSummary, TrackEnrollmentWithProgress } from '@learning/shared';
import { colors, font, fontSize, radius, spacing } from '@/theme';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { useProgress } from '@/hooks/useProgress';
import { useSavedLessons } from '@/hooks/useLesson';
import { useEnrollments } from '@/hooks/useTrack';

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

function ProgressBar({ value }: { value: number }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${clamped}%` as `${number}%` }]} />
    </View>
  );
}

function SavedLessonRow({ lesson }: { lesson: LessonSummary }) {
  return (
    <Card testID="saved-lesson-row" style={styles.savedRow}>
      <Text style={styles.savedTitle}>{lesson.title}</Text>
      <Text style={styles.savedMeta}>
        {[lesson.topicName, lesson.skillName].filter(Boolean).join(' · ')}
      </Text>
    </Card>
  );
}

export default function ProgressScreen() {
  const { data, isLoading, isError } = useProgress();
  const { data: savedLessons } = useSavedLessons();
  const { data: enrollmentsData } = useEnrollments();

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
            <View style={styles.statsRow}>
              <Card style={styles.statCard}>
                <Text testID="progress-streak" style={styles.statValue}>{data.currentStreak}</Text>
                <Text style={styles.statLabel}>Day Streak</Text>
              </Card>

              <Card style={styles.statCard}>
                <Text testID="progress-lessons-count" style={styles.statValue}>{data.totalLessonsCompleted}</Text>
                <Text style={styles.statLabel}>Lessons Done</Text>
              </Card>

              <Card style={styles.statCard}>
                <Text testID="progress-avg-score" style={styles.statValue}>{data.averageScore}%</Text>
                <Text style={styles.statLabel}>Avg Score</Text>
              </Card>
            </View>

            {data.lastLessonDate && (
              <Card style={styles.dateCard}>
                <Text style={styles.dateLabel}>
                  Last lesson: {new Date(data.lastLessonDate).toLocaleDateString()}
                </Text>
              </Card>
            )}
          </>
        )}

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
                  <ProgressBar value={pct} />
                  <Text style={styles.motivationText}>{trackMotivation(e, pct)}</Text>
                  <Text style={styles.lessonsCount}>
                    {e.completedLessons} of {e.totalLessons} lessons complete
                  </Text>
                </Card>
              );
            })}
          </View>
        )}

        {completedEnrollments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Completed Tracks</Text>
            {completedEnrollments.map(e => (
              <Card key={e.skillId} testID={`completed-card-${e.skillId}`} style={styles.completedCard}>
                <Text style={styles.enrollmentTitle}>{e.skill.name}</Text>
                <Badge label="Completed" variant="success" />
              </Card>
            ))}
          </View>
        )}

        {hasNoEnrollments && (
          <Text testID="no-enrollments-msg" style={styles.empty}>
            No active tracks. Browse Tracks to get started.
          </Text>
        )}

        <Text style={styles.sectionHeading}>Saved</Text>
        {savedLessons && savedLessons.length > 0 ? (
          <View style={styles.savedList}>
            {savedLessons.map((lesson) => (
              <SavedLessonRow key={lesson.id} lesson={lesson} />
            ))}
          </View>
        ) : (
          <Text style={styles.empty}>No saved lessons yet.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content:   { padding: spacing.md, flexGrow: 1 },
  heading: {
    fontFamily:   font.bold,
    fontSize:     fontSize.xl,
    color:        colors.textDark,
    marginBottom: spacing.lg,
  },
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
    fontFamily: font.bold,
    fontSize:   fontSize.xl,
    color:      colors.teal,
  },
  statLabel: {
    fontFamily: font.regular,
    fontSize:   fontSize.xs,
    color:      colors.textMuted,
    textAlign:  'center',
  },
  dateCard: { marginTop: spacing.sm },
  dateLabel: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
  },
  sectionHeading: {
    fontFamily:   font.bold,
    fontSize:     fontSize.sm,
    color:        colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop:    spacing.lg,
    marginBottom: spacing.sm,
  },
  savedList: { gap: spacing.sm },
  savedRow: { gap: spacing.xs, borderRadius: radius.card },
  savedTitle: {
    fontFamily: font.bold,
    fontSize:   fontSize.base,
    color:      colors.textDark,
  },
  savedMeta: {
    fontFamily: font.regular,
    fontSize:   fontSize.xs,
    color:      colors.textMuted,
  },
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
  // ── Enrollment sections ───────────────────────────────────────────────────
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
    fontFamily: font.bold,
    fontSize:   fontSize.base,
    color:      colors.textDark,
    flex:       1,
  },
  pctText: {
    fontFamily: font.medium,
    fontSize:   fontSize.sm,
    color:      colors.teal,
  },
  progressTrack: {
    height:          6,
    backgroundColor: colors.border,
    borderRadius:    3,
    overflow:        'hidden',
  },
  progressFill: {
    height:          6,
    backgroundColor: colors.teal,
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
  completedCard: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
});
