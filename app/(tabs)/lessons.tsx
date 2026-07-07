import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, font, fontSize, spacing } from '@/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useEnrollments } from '@/hooks/useTrack';
import { useProgress } from '@/hooks/useProgress';
import type { TrackEnrollmentWithProgress } from '@learning/shared';
import { TrackMap } from '@/components/ui/TrackMap';

const difficultyVariant = {
  beginner:     'success',
  intermediate: 'warning',
  advanced:     'error',
} as const;

function flooredPct(enrollment: TrackEnrollmentWithProgress): number {
  return enrollment.completedLessons > 0
    ? Math.max(1, Math.round(enrollment.percentComplete))
    : 0;
}

function streakCopy(streak: number): string {
  if (streak === 0) return 'Complete a lesson today to start your streak';
  if (streak <= 2) return "You're building a habit — keep going!";
  if (streak <= 6) return `You're on a ${streak}-day streak — don't break it!`;
  if (streak <= 29) return `Impressive — ${streak} days in a row!`;
  return `You're on fire — ${streak}-day streak!`;
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


export default function LessonsScreen() {
  const { data: enrollmentsData } = useEnrollments();
  const { data: progress } = useProgress();
  const router = useRouter();

  const activeEnrollments: TrackEnrollmentWithProgress[] =
    enrollmentsData?.filter(e => e.percentComplete < 100) ?? [];
  const completedEnrollments: TrackEnrollmentWithProgress[] =
    enrollmentsData?.filter(e => e.percentComplete >= 100) ?? [];
  const hasNoEnrollments = Array.isArray(enrollmentsData) && enrollmentsData.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        {progress && progress.currentStreak > 3 && (
          <View testID="streak-banner" style={styles.streakBanner}>
            <Text style={styles.streakBannerText}>
              {'You\'re on a '}
              <Text style={styles.streakBannerBold}>{progress.currentStreak}-day streak</Text>
              {' — keep it alive!'}
            </Text>
          </View>
        )}

        {progress && (
          <Card testID="streak-card" style={styles.streakCard}>
            <View style={styles.streakRow}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <Text style={styles.streakNumber}>{progress.currentStreak} day streak</Text>
            </View>
            <Text style={styles.streakCopyText}>{streakCopy(progress.currentStreak)}</Text>
          </Card>
        )}

        {activeEnrollments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Active Tracks</Text>
            {activeEnrollments.map(e => {
              const pct = flooredPct(e);
              const nextLesson = e.nextLesson;
              const level = (nextLesson as any)?.skillPath?.level as string | undefined;
              return (
                <Card key={e.skillId} testID={`enrollment-card-${e.skillId}`} style={styles.enrollmentCard}>
                  <View style={styles.enrollmentHeader}>
                    <Text style={styles.enrollmentTitle}>{e.skill.name}</Text>
                    <Text style={styles.pctText}>{pct}% complete</Text>
                  </View>
                  <ProgressBar value={pct} />
                  {e.levels?.length > 0 && (
                    <TrackMap levels={e.levels} currentLevel={level} />
                  )}
                  <Text style={styles.motivationText}>{trackMotivation(e, pct)}</Text>
                  <Text style={styles.lessonsCount}>
                    {e.completedLessons} of {e.totalLessons} lessons complete
                  </Text>
                  {nextLesson ? (
                    <View style={styles.nextLessonSection}>
                      <Text style={styles.nextLessonTitle}>{(nextLesson as any).title}</Text>
                      <View style={styles.nextLessonMeta}>
                        {level && (
                          <Badge
                            label={level}
                            variant={difficultyVariant[level as keyof typeof difficultyVariant] ?? 'info'}
                          />
                        )}
                        {(nextLesson as any).topicName && (
                          <Text style={styles.positionLabel}>
                            {(nextLesson as any).topicName} · Lesson {(nextLesson as any).lessonIndex} of {(nextLesson as any).totalLessons}
                          </Text>
                        )}
                      </View>
                      <Button
                        testID={`next-lesson-btn-${e.skillId}`}
                        label="Next Lesson →"
                        style={styles.continueBtn}
                        onPress={() => router.push(`/(tabs)/lesson/${(nextLesson as any).id}`)}
                      />
                    </View>
                  ) : (
                    <Text style={styles.noNextLesson}>No lessons available yet.</Text>
                  )}
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
          <Card testID="start-learning-card" style={styles.card}>
            <Text style={styles.emptyTitle}>Start Learning</Text>
            <Text style={styles.emptyBody}>Browse available tracks and enrol to get started.</Text>
            <Button
              testID="browse-tracks-btn"
              label="Browse Tracks →"
              style={styles.quizBtn}
              onPress={() => router.push('/(tabs)/tracks')}
            />
          </Card>
        )}

        {progress && (
          <View style={styles.statsRow}>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>{progress.totalLessonsCompleted}</Text>
              <Text style={styles.statLabel}>Lessons Completed</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>{Math.round(progress.averageScore)}%</Text>
              <Text style={styles.statLabel}>Avg Score</Text>
            </Card>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content:   { padding: spacing.md, flexGrow: 1 },
  card: { gap: spacing.md },
  quizBtn: { marginTop: spacing.sm },
  emptyTitle: {
    fontFamily: font.bold,
    fontSize:   fontSize.md,
    color:      colors.textDark,
  },
  emptyBody: {
    fontFamily: font.regular,
    fontSize:   fontSize.base,
    color:      colors.textMuted,
  },
  streakCard: {
    gap:          spacing.xs,
    marginBottom: spacing.md,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
  },
  streakEmoji: {
    fontSize: 24,
  },
  streakNumber: {
    fontFamily: font.bold,
    fontSize:   fontSize.md,
    color:      colors.textDark,
  },
  streakCopyText: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
  },
  section: {
    gap:          spacing.sm,
    marginBottom: spacing.md,
  },
  sectionHeading: {
    fontFamily: font.bold,
    fontSize:   fontSize.base,
    color:      colors.textDark,
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
  nextLessonSection: {
    gap:          spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop:   spacing.sm,
    marginTop:    spacing.xs,
  },
  nextLessonTitle: {
    fontFamily: font.medium,
    fontSize:   fontSize.sm,
    color:      colors.textDark,
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
  completedCard: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap:           spacing.md,
    marginTop:     spacing.lg,
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
    fontFamily: font.bold,
  },
});
