import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, font, fontSize, spacing } from '@/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useEnrollments, useCustomPlans, useSkipTopic, useSkipLevel } from '@/hooks/useTrack';
import { useProgress } from '@/hooks/useProgress';
import type { TrackEnrollmentWithProgress } from '@learning/shared';
import { TrackMap } from '@/components/ui/TrackMap';
import { NoTrackNotice } from '@/components/ui/NoTrackNotice';
import { Ring } from '@/components/ui/Ring';

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
  const { data: customPlans } = useCustomPlans();
  const { data: progress } = useProgress();
  const router = useRouter();
  const skipTopic = useSkipTopic();
  const skipLevel = useSkipLevel();

  const activeEnrollments: TrackEnrollmentWithProgress[] =
    (enrollmentsData?.filter(e => e.percentComplete < 100) ?? [])
      .sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0));
  const completedEnrollments: TrackEnrollmentWithProgress[] =
    enrollmentsData?.filter(e => e.percentComplete >= 100) ?? [];
  const hasNoEnrollments = Array.isArray(enrollmentsData) && enrollmentsData.length === 0;
  // A user with custom plans but no track enrollment still has content — don't show NoTrackNotice.
  const hasNoContent = hasNoEnrollments && (!customPlans || customPlans.length === 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* First thing on the screen — 069 items 1+2. It used to render below the
            streak hero and the stats row, so a brand-new user met a wall of zeros
            before reaching the one action available to them. */}
        {hasNoContent && <NoTrackNotice />}

        {/* Custom-built plans from the Albert track builder (ticket 071).
            Rendered before enrollments and the streak hero per backend comment. */}
        {customPlans && customPlans.length > 0 && (
          <View testID="custom-plans-section" style={styles.section}>
            <Text style={styles.sectionHeading}>My Path</Text>
            {customPlans.map(plan => {
              const pct = plan.totalLessons === 0 ? 0 : Math.min(100, Math.round(plan.percentComplete));
              return (
                <Card key={plan.id} testID={`custom-plan-card-${plan.id}`} style={styles.nextLessonCard}>
                  <Text testID={`custom-plan-name-${plan.id}`} style={styles.nextLessonTrackName}>
                    {plan.name}
                  </Text>
                  <View style={styles.enrollmentHeader}>
                    <Text style={styles.pctText}>{pct}% complete</Text>
                  </View>
                  <ProgressBar value={pct} />
                  <Text style={styles.lessonsCount}>
                    {plan.completedLessons} of {plan.totalLessons} lessons complete
                  </Text>
                  {plan.unresolvedTopics > 0 && (
                    <Text testID={`plan-unresolved-${plan.id}`} style={styles.noNextLesson}>
                      {plan.unresolvedTopics} topic{plan.unresolvedTopics !== 1 ? 's' : ''} not yet available
                    </Text>
                  )}
                  {plan.nextLesson ? (
                    <>
                      <Text style={styles.nextLessonTitle}>{plan.nextLesson.title}</Text>
                      <Button
                        testID={`custom-plan-btn-${plan.id}`}
                        label="Start Lesson →"
                        style={styles.continueBtn}
                        onPress={() => router.push(`/(tabs)/lesson/${plan.nextLesson!.id}`)}
                      />
                    </>
                  ) : (
                    <Text testID={`custom-plan-no-lesson-${plan.id}`} style={styles.noNextLesson}>
                      No lessons available yet.
                    </Text>
                  )}
                </Card>
              );
            })}
          </View>
        )}

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

        {activeEnrollments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Active Tracks</Text>
            {activeEnrollments.flatMap(e => {
              const pct = flooredPct(e);
              const nextLesson = e.nextLesson;
              const level = (nextLesson as any)?.skillPath?.level as string | undefined;
              const levelLabel = (nextLesson as any)?.skillPath?.levelLabel as string | null | undefined;
              const cards = [];

              if (nextLesson) {
                cards.push(
                  <Card key={`${e.skillId}-next`} testID={`next-lesson-card-${e.skillId}`} style={styles.nextLessonCard}>
                    {e.isActive && (
                      <View testID={`active-track-label-${e.skillId}`}>
                        <Badge label="Active" variant="success" />
                      </View>
                    )}
                    <Text style={styles.nextLessonTrackName}>{e.skill.name}</Text>
                    <View style={styles.nextLessonMeta}>
                      {level && (
                        <Badge
                          label={levelLabel ?? level}
                          variant={difficultyVariant[level as keyof typeof difficultyVariant] ?? 'info'}
                        />
                      )}
                      {(nextLesson as any).topicName && (
                        <Text style={styles.positionLabel}>
                          {(nextLesson as any).topicName} · Lesson {(nextLesson as any).lessonIndex} of {(nextLesson as any).totalLessons}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.nextLessonTitle}>{(nextLesson as any).title}</Text>
                    {(nextLesson as any).summary && (
                      <Text style={styles.nextLessonSummary}>{(nextLesson as any).summary}</Text>
                    )}
                    <Button
                      testID={`next-lesson-btn-${e.skillId}`}
                      label="Start Lesson →"
                      style={styles.continueBtn}
                      onPress={() => router.push(`/(tabs)/lesson/${(nextLesson as any).id}`)}
                    />
                    {e.canSkipTopic && (
                      <Button
                        testID={`skip-topic-btn-${e.skillId}`}
                        label="Skip Topic →"
                        variant="outline"
                        style={styles.skipBtn}
                        loading={skipTopic.isPending}
                        onPress={() => skipTopic.mutate(e.skillId)}
                      />
                    )}
                    {e.canSkipLevel && (
                      <Button
                        testID={`skip-level-btn-${e.skillId}`}
                        label="Skip Level →"
                        variant="outline"
                        style={styles.skipBtn}
                        loading={skipLevel.isPending}
                        onPress={() => skipLevel.mutate(e.skillId)}
                      />
                    )}
                  </Card>
                );
              }

              cards.push(
                <Card key={e.skillId} testID={`enrollment-card-${e.skillId}`} style={styles.enrollmentCard}>
                  <View style={styles.enrollmentHeader}>
                    <Text style={styles.enrollmentTitle}>{e.skill.name}</Text>
                    <Text style={styles.pctText}>{pct}% complete</Text>
                  </View>
                  <ProgressBar value={pct} />
                  {e.levels?.length > 0 && (
                    <TrackMap levels={e.levels} />
                  )}
                  <Text style={styles.motivationText}>{trackMotivation(e, pct)}</Text>
                  <Text style={styles.lessonsCount}>
                    {e.completedLessons} of {e.totalLessons} lessons complete
                  </Text>
                  {!nextLesson && (
                    <Text style={styles.noNextLesson}>No lessons available yet.</Text>
                  )}
                </Card>
              );

              return cards;
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
