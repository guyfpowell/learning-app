import { useEffect, useRef, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { isAxiosError } from 'axios';
import { colors, font, fontSize, spacing } from '@/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { BookmarkButton } from '@/components/ui/BookmarkButton';
import { QuizModal } from '@/components/QuizModal';
import { useTodayLesson, useSaveLesson, useUnsaveLesson } from '@/hooks/useLesson';
import { useEnrollments } from '@/hooks/useTrack';
import { useProgress } from '@/hooks/useProgress';
import type { LessonContent, TrackEnrollmentWithProgress } from '@learning/shared';

const difficultyVariant = {
  beginner:     'success',
  intermediate: 'warning',
  advanced:     'error',
} as const;

function isPremiumError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 403 &&
    (error.response?.data?.code === 'LESSON_004' || error.response?.data?.code === 'LESSON_005')
}

function isTeaserLimitError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.data?.code === 'LESSON_005'
}

function flooredPct(enrollment: TrackEnrollmentWithProgress): number {
  return enrollment.completedLessons > 0
    ? Math.max(1, Math.round(enrollment.percentComplete))
    : 0;
}

function streakCopy(streak: number): string {
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

function LessonBody({ raw }: { raw: string }) {
  let parsed: LessonContent | null = null;
  try {
    parsed = JSON.parse(raw) as LessonContent;
  } catch {
    // not valid JSON — render as plain text
  }

  if (!parsed) {
    return <Text style={styles.contentText}>{raw}</Text>;
  }

  return (
    <View style={styles.contentBlock}>
      {!!parsed.introduction && (
        <Text testID="lesson-introduction" style={styles.contentText}>
          {parsed.introduction}
        </Text>
      )}
      {Array.isArray(parsed.keyPoints) && parsed.keyPoints.length > 0 && (
        <View style={styles.keyPoints}>
          {parsed.keyPoints.map((pt, i) => (
            <Text key={i} style={styles.keyPoint}>• {pt}</Text>
          ))}
        </View>
      )}
      {!!parsed.example && (
        <Text style={styles.exampleText}>{parsed.example}</Text>
      )}
    </View>
  );
}

function PremiumModal({ visible, error, onClose }: { visible: boolean; error: unknown; onClose: () => void }) {
  const isLimit = isTeaserLimitError(error)
  const teasersUsed: number = isAxiosError(error) ? (error.response?.data?.teasersUsed ?? 0) : 0

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalSheet}>
          <Text style={styles.modalIcon}>🔒</Text>
          <Text style={styles.modalTitle}>
            {isLimit ? 'Free Preview Limit Reached' : 'Premium Content'}
          </Text>
          <Text style={styles.modalBody}>
            {isLimit
              ? `You've used ${teasersUsed} of 3 free previews this month. Upgrade to continue learning.`
              : 'This is premium content. Upgrade to unlock unlimited access to all lessons.'}
          </Text>
          <Button label="Upgrade now" style={styles.upgradeBtn} onPress={onClose} />
          <Pressable onPress={onClose} style={styles.dismissBtn}>
            <Text style={styles.dismissText}>Maybe later</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  )
}

export default function LessonsScreen() {
  const { data: lesson, isLoading, isError, error } = useTodayLesson();
  const { data: enrollmentsData } = useEnrollments();
  const { data: progress } = useProgress();
  const router = useRouter();
  const [quizVisible, setQuizVisible] = useState(false);
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [lessonY, setLessonY] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const saveLesson = useSaveLesson();
  const unsaveLesson = useUnsaveLesson();

  useEffect(() => {
    setIsSaved(!!lesson?.isSaved);
  }, [lesson?.id, lesson?.isSaved]);

  useEffect(() => {
    setCompleted(false);
  }, [lesson?.id]);

  const showPremiumError = isError && isPremiumError(error);

  const activeEnrollments: TrackEnrollmentWithProgress[] =
    enrollmentsData?.filter(e => e.percentComplete < 100) ?? [];
  const completedEnrollments: TrackEnrollmentWithProgress[] =
    enrollmentsData?.filter(e => e.percentComplete >= 100) ?? [];
  const hasNoEnrollments = Array.isArray(enrollmentsData) && enrollmentsData.length === 0;

  function handleToggleSave() {
    if (!lesson) return;
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    if (nextSaved) {
      saveLesson.mutate(lesson.id, { onError: () => setIsSaved(!nextSaved) });
    } else {
      unsaveLesson.mutate(lesson.id, { onError: () => setIsSaved(!nextSaved) });
    }
  }

  function handleContinue() {
    scrollRef.current?.scrollTo({ y: lessonY, animated: true });
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>

        {progress && progress.currentStreak > 0 && (
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
                  <Button label="Continue" style={styles.continueBtn} onPress={handleContinue} />
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

        <Text style={styles.heading}>Today's Lesson</Text>

        {isLoading && <Spinner fullScreen />}

        {isError && !showPremiumError && (
          <Text style={styles.error}>Unable to load lesson. Please try again.</Text>
        )}

        {isError && showPremiumError && (
          <Card testID="premium-error-card" style={styles.card}>
            <Text style={styles.premiumIcon}>🔒</Text>
            <Text style={styles.premiumTitle}>
              {isTeaserLimitError(error) ? 'Free Preview Limit Reached' : 'Premium Content'}
            </Text>
            <Button
              label="Learn more"
              style={styles.quizBtn}
              onPress={() => setPremiumModalVisible(true)}
            />
          </Card>
        )}

        {!isLoading && !isError && lesson === null && (
          <Text style={styles.empty}>No lesson scheduled for today.</Text>
        )}

        {lesson && (
          <View onLayout={e => setLessonY(e.nativeEvent.layout.y)}>
            <Card testID="lesson-card" style={styles.card}>
              <View style={styles.titleRow}>
                <Text testID="lesson-title" style={styles.title}>{lesson.title}</Text>
                <BookmarkButton saved={isSaved} onToggle={handleToggleSave} />
              </View>

              <View style={styles.meta}>
                <Badge
                  label={lesson.difficulty}
                  variant={difficultyVariant[lesson.difficulty]}
                />
                <Text style={styles.duration}>{lesson.durationMinutes} min</Text>
                {lesson.isTeaser && (
                  <View testID="teaser-badge">
                    <Badge label="Free preview" variant="info" />
                  </View>
                )}
              </View>

              {lesson.summary && (
                <Text testID="lesson-summary" style={styles.summaryText}>{lesson.summary}</Text>
              )}

              {lesson.mediaUrl && (
                <Image
                  testID="lesson-media"
                  source={{ uri: lesson.mediaUrl }}
                  style={styles.media}
                  resizeMode="cover"
                  accessibilityLabel="Lesson media"
                />
              )}

              <LessonBody raw={lesson.content} />

              {completed && lesson.keyTakeaway && (
                <View testID="key-takeaway" style={styles.takeawayBlock}>
                  <Text style={styles.takeawayLabel}>Key Takeaway</Text>
                  <Text style={styles.takeawayText}>{lesson.keyTakeaway}</Text>
                </View>
              )}

              {!completed && (
                <Button
                  testID="complete-btn"
                  label="Complete Lesson"
                  style={[styles.quizBtn, styles.completeBtn]}
                  onPress={() => setCompleted(true)}
                />
              )}

              {completed && (
                <Button
                  testID="lesson-quiz-btn"
                  label="Take Quiz"
                  style={styles.quizBtn}
                  onPress={() => setQuizVisible(true)}
                />
              )}
            </Card>
          </View>
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

      {lesson && (
        <QuizModal
          visible={quizVisible}
          lesson={lesson}
          onClose={() => setQuizVisible(false)}
        />
      )}

      <PremiumModal
        visible={premiumModalVisible}
        error={error}
        onClose={() => setPremiumModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content:   { padding: spacing.md, flexGrow: 1 },
  heading: {
    fontFamily: font.bold,
    fontSize:   fontSize.lg,
    color:      colors.textDark,
    marginBottom: spacing.md,
    marginTop:    spacing.lg,
  },
  card: { gap: spacing.md },
  titleRow: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    justifyContent: 'space-between',
    gap:            spacing.sm,
  },
  title: {
    fontFamily: font.bold,
    fontSize:   fontSize.md,
    color:      colors.textDark,
    flex:       1,
  },
  meta: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
    flexWrap:      'wrap',
  },
  duration: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
  },
  summaryText: {
    fontFamily:  font.regular,
    fontSize:    fontSize.base,
    color:       colors.textMuted,
    fontStyle:   'italic',
    lineHeight:  fontSize.base * 1.5,
  },
  media: {
    width:        '100%',
    height:       180,
    borderRadius: 8,
  },
  contentBlock: {
    gap: spacing.sm,
  },
  contentText: {
    fontFamily: font.regular,
    fontSize:   fontSize.base,
    color:      colors.textDark,
    lineHeight: fontSize.base * 1.6,
  },
  keyPoints: {
    gap: spacing.xs,
    paddingLeft: spacing.sm,
  },
  keyPoint: {
    fontFamily: font.regular,
    fontSize:   fontSize.base,
    color:      colors.textDark,
    lineHeight: fontSize.base * 1.5,
  },
  exampleText: {
    fontFamily:      font.regular,
    fontSize:        fontSize.base,
    color:           colors.textDark,
    lineHeight:      fontSize.base * 1.6,
    backgroundColor: colors.border,
    borderRadius:    6,
    padding:         spacing.sm,
    fontStyle:       'italic',
  },
  takeawayBlock: {
    borderLeftWidth:  4,
    borderLeftColor:  colors.teal,
    paddingLeft:      spacing.md,
    paddingVertical:  spacing.sm,
    backgroundColor:  colors.tealLight + '18',
    borderRadius:     4,
    gap:              spacing.xs,
  },
  takeawayLabel: {
    fontFamily: font.bold,
    fontSize:   fontSize.sm,
    color:      colors.teal,
    letterSpacing: 0.5,
  },
  takeawayText: {
    fontFamily: font.regular,
    fontSize:   fontSize.base,
    color:      colors.textDark,
    lineHeight: fontSize.base * 1.5,
  },
  quizBtn:     { marginTop: spacing.sm },
  completeBtn: { backgroundColor: '#F97316' },
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
  premiumIcon: {
    fontSize:  40,
    textAlign: 'center',
  },
  premiumTitle: {
    fontFamily: font.bold,
    fontSize:   fontSize.md,
    color:      colors.textDark,
    textAlign:  'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.xl,
    gap: spacing.md,
    alignItems: 'center',
  },
  modalIcon: {
    fontSize: 48,
  },
  modalTitle: {
    fontFamily: font.bold,
    fontSize:   fontSize.lg,
    color:      colors.textDark,
    textAlign:  'center',
  },
  modalBody: {
    fontFamily: font.regular,
    fontSize:   fontSize.base,
    color:      colors.textMuted,
    textAlign:  'center',
    lineHeight: fontSize.base * 1.5,
  },
  upgradeBtn:  { width: '100%' },
  dismissBtn:  { paddingVertical: spacing.sm },
  dismissText: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
    textAlign:  'center',
  },
  // ── Dashboard additions ───────────────────────────────────────────────────
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
    height:       6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow:     'hidden',
  },
  progressFill: {
    height:       6,
    backgroundColor: colors.teal,
    borderRadius: 3,
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
  continueBtn: {
    marginTop: spacing.xs,
  },
  completedCard: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
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
});
