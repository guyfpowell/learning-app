import { useEffect, useRef, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { isAxiosError } from 'axios';
import * as Sentry from '@sentry/react-native';
import type { ApiErrorResponse, PremiumRequiredDetails } from '@learning/shared';
import { colors, font, fontSize, spacing } from '@/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, LEVEL_BADGE_VARIANT } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { BookmarkButton } from '@/components/ui/BookmarkButton';
import { QuizModal } from '@/components/QuizModal';
import { useLesson, useSaveLesson, useUnsaveLesson, useStartRetake } from '@/hooks/useLesson';
import { useLessonClock } from '@/hooks/useLessonClock';
import { isRetakeInProgress } from '@/lib/lessonFlow';
import { lessonService } from '@/services/lesson.service';
import { usePaths } from '@/hooks/useTrack';
import { PAYWALL_ROUTE } from '@/lib/subscriptions';
import type { LessonPhase, UserPath } from '@learning/shared';
import { PREMIUM_LESSON_BUDGET } from '@learning/shared';

function isPremiumError(error: unknown): boolean {
  return (
    isAxiosError(error) &&
    error.response?.status === 403 &&
    (error.response?.data?.code === 'LESSON_004' || error.response?.data?.code === 'LESSON_005')
  );
}

function isTeaserLimitError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.data?.code === 'LESSON_005';
}

function isNotFoundError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 404;
}

function flooredPct(path: UserPath): number {
  return path.completedLessons > 0
    ? Math.max(1, Math.round(path.percentComplete))
    : 0;
}

function LessonBody({ raw }: { raw: string }) {
  return (
    <View style={styles.contentBlock}>
      <Text style={styles.scenarioLabel}>Scenario</Text>
      <Text testID="scenario-content" style={styles.contentText}>{raw}</Text>
    </View>
  );
}

function PremiumModal({
  visible,
  error,
  onClose,
  onUpgrade,
}: {
  visible: boolean;
  error: unknown;
  onClose: () => void;
  onUpgrade: () => void;
}) {
  const isLimit = isTeaserLimitError(error);
  const details: Partial<PremiumRequiredDetails> | undefined =
    isAxiosError<ApiErrorResponse<Partial<PremiumRequiredDetails>>>(error) ? error.response?.data?.details : undefined;
  const teasersUsed = details?.teasersUsed ?? 0;
  const teasersRemaining = details?.teasersRemaining ?? PREMIUM_LESSON_BUDGET - teasersUsed;

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
              ? `You've used ${teasersUsed} of ${PREMIUM_LESSON_BUDGET} free previews. Upgrade to continue learning.`
              : 'This is premium content. Upgrade to unlock unlimited access to all lessons.'}
          </Text>
          {isLimit && (
            <Text style={styles.teasersRemaining}>
              {teasersRemaining} free preview{teasersRemaining === 1 ? '' : 's'} remaining
            </Text>
          )}
          <Button label="Upgrade now" onPress={onUpgrade} />
          <Pressable onPress={onClose} style={styles.dismissBtn}>
            <Text style={styles.dismissText}>Maybe later</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

export default function LessonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: lesson, isLoading, isError, error } = useLesson(id ?? '');
  const { data: paths } = usePaths();
  const [quizVisible, setQuizVisible] = useState(false);
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [phase, setPhase] = useState<LessonPhase>('collapsed');
  const saveLesson = useSaveLesson();
  const unsaveLesson = useUnsaveLesson();
  const startRetake = useStartRetake();
  const clock = useLessonClock();
  const [retakeStarted, setRetakeStarted] = useState(false);
  const [retakeError, setRetakeError] = useState(false);

  // Guards against re-initialising phase after the user has manually transitioned
  const phaseInitialized = useRef<string | null>(null);

  // Server-persisted read position: non-null when the user has opened but not
  // completed this lesson. undefined = paths query still loading.
  const resumePhase: LessonPhase | null | undefined = paths
    ? (() => {
        for (const p of paths) {
          if (p.nextLesson?.id === id) return p.nextLesson.resumePhase ?? null;
        }
        return null;
      })()
    : undefined;

  // Fire-and-forget position write: a failure is silent to the user (spec constraint 6), never to us.
  function updatePosition(lessonId: string, p: LessonPhase) {
    lessonService.updatePosition(lessonId, p).catch((err) => {
      Sentry.addBreadcrumb({ category: 'lesson', message: 'Position save failed', level: 'warning', data: { lessonId, phase: p, err: String(err) } });
    });
  }

  useEffect(() => {
    setIsSaved(!!lesson?.isSaved);
  }, [lesson?.id, lesson?.isSaved]);

  useEffect(() => {
    if (!lesson || phaseInitialized.current === lesson.id) return;
    if (resumePhase === undefined) return; // wait for paths to load
    const initial: LessonPhase = lesson.quizCompleted
      ? 'takeaway'
      : (resumePhase ?? 'collapsed');
    setPhase(initial);
    phaseInitialized.current = lesson.id;
    updatePosition(lesson.id, initial);
  }, [lesson?.id, lesson?.quizCompleted, resumePhase]);

  // The progress bar belongs to the track this lesson sits in. A custom path can
  // contain the same lesson, but the lesson's own skill is what it is a part of.
  const enrollment = lesson?.skillPath?.skillId
    ? paths?.find(p => p.kind === 'track' && p.id === lesson.skillPath?.skillId)
    : undefined;
  const pct = enrollment ? flooredPct(enrollment) : null;

  const showPremiumError = isError && isPremiumError(error);
  const showNotFound = isError && isNotFoundError(error);
  const lessonError = isAxiosError(error)
    ? (error.response?.data?.message ?? error.message ?? 'Unable to load lesson. Please try again.')
    : 'Unable to load lesson. Please try again.';

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

  const retakeInProgress = lesson ? isRetakeInProgress(lesson, retakeStarted) : false;

  // A new pass: POST /retake, restart the clock, and read the lesson again from the top.
  function handleRetake() {
    if (!lesson) return;
    setRetakeError(false);
    startRetake.mutate(lesson.id, {
      onSuccess: () => {
        clock.reset();
        setRetakeStarted(true);
        setPhase('collapsed');
        updatePosition(lesson.id, 'collapsed');
      },
      onError: () => setRetakeError(true),
    });
  }

  const hasTrackHeader = !!(enrollment || lesson?.skillPath?.level || lesson?.topicName);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        {isLoading && (
          <View testID="loading-indicator">
            <Spinner fullScreen />
          </View>
        )}

        {isError && showNotFound && (
          <Text testID="lesson-not-found" style={styles.error}>Lesson not found</Text>
        )}

        {isError && !showPremiumError && !showNotFound && (
          <Text testID="lesson-error" style={styles.error}>{lessonError}</Text>
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

        {lesson && (
          <>
            {hasTrackHeader && (
              <View testID="track-header" style={styles.trackHeader}>
                {enrollment && (
                  <View style={styles.trackTitleRow}>
                    <Text style={styles.trackName}>{enrollment.name}</Text>
                    {pct !== null && (
                      <Text style={styles.trackPct}>{pct}% complete</Text>
                    )}
                  </View>
                )}
                <View style={styles.trackMeta}>
                  {lesson.skillPath?.level && (
                    <Badge
                      label={lesson.skillPath.levelLabel ?? lesson.skillPath.level}
                      variant={LEVEL_BADGE_VARIANT[lesson.skillPath.level]}
                    />
                  )}
                  {lesson.topicName && (
                    <Text style={styles.topicName}>{lesson.topicName}</Text>
                  )}
                  {lesson.topicName && lesson.lessonIndex != null && lesson.totalLessons != null && (
                    <Text style={styles.positionLabel}>
                      {`· Lesson ${lesson.lessonIndex} of ${lesson.totalLessons}`}
                    </Text>
                  )}
                </View>
              </View>
            )}

            <Card testID="lesson-card" style={styles.card}>
              <View style={styles.titleRow}>
                <Text testID="lesson-title" style={styles.title}>{lesson.title}</Text>
                <BookmarkButton saved={isSaved} onToggle={handleToggleSave} />
              </View>

              <View style={styles.meta}>
                <Badge
                  label={lesson.skillPath?.levelLabel ?? lesson.difficulty}
                  variant={LEVEL_BADGE_VARIANT[lesson.difficulty]}
                />
                <Text style={styles.duration}>{lesson.durationMinutes} minutes</Text>
              </View>

              {phase === 'collapsed' && lesson.summary && (
                <Text testID="lesson-summary" style={styles.summaryText}>{lesson.summary}</Text>
              )}

              {phase === 'expanded' && lesson.mediaUrl && (
                <Image
                  testID="lesson-media"
                  source={{ uri: lesson.mediaUrl }}
                  style={styles.media}
                  resizeMode="cover"
                  accessibilityLabel="Lesson media"
                />
              )}

              {phase === 'expanded' && <LessonBody raw={lesson.content} />}

              {phase === 'takeaway' && !retakeInProgress && (
                <View testID="lesson-completed-banner" style={styles.completedBanner}>
                  <Text style={styles.completedBannerText}>✓ Lesson completed!</Text>
                </View>
              )}

              {phase === 'takeaway' && lesson.keyTakeaway && (
                <View testID="key-takeaway" style={styles.takeawayBlock}>
                  <Text style={styles.takeawayLabel}>Key takeaway</Text>
                  <Text style={styles.takeawayText}>{lesson.keyTakeaway}</Text>
                </View>
              )}

              {phase === 'collapsed' && (
                <Button
                  testID="continue-btn"
                  label="Continue"
                  style={styles.quizBtn}
                  onPress={() => {
                    setPhase('expanded');
                    if (lesson) updatePosition(lesson.id, 'expanded');
                  }}
                />
              )}

              {phase === 'expanded' && (
                <Button
                  testID="key-takeaway-btn"
                  label="Key Takeaway"
                  style={[styles.quizBtn, styles.completeBtn]}
                  onPress={() => {
                    setPhase('takeaway');
                    if (lesson) updatePosition(lesson.id, 'takeaway');
                  }}
                />
              )}

              {phase === 'takeaway' && (
                <Button
                  testID="lesson-quiz-btn"
                  label="Test My Knowledge"
                  style={styles.quizBtn}
                  onPress={() => setQuizVisible(true)}
                />
              )}

              {phase === 'takeaway' && lesson.quizCompleted && !retakeInProgress && (
                <Button
                  testID="lesson-retake-btn"
                  label="Retake lesson"
                  variant="secondary"
                  loading={startRetake.isPending}
                  style={styles.quizBtn}
                  onPress={handleRetake}
                />
              )}

              {retakeError && (
                <Text testID="retake-error" style={styles.error}>Couldn't start the retake. Please try again.</Text>
              )}
            </Card>
          </>
        )}

      </ScrollView>

      {lesson && (
        <QuizModal
          visible={quizVisible}
          lesson={lesson}
          onClose={() => setQuizVisible(false)}
          completionTime={clock.seconds}
          retakeInProgress={retakeInProgress}
        />
      )}

      <PremiumModal
        visible={premiumModalVisible}
        error={error}
        onClose={() => setPremiumModalVisible(false)}
        onUpgrade={() => {
          setPremiumModalVisible(false);
          router.push(PAYWALL_ROUTE);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content:   { padding: spacing.md, flexGrow: 1 },

  trackHeader: {
    gap:          spacing.xs,
    marginBottom: spacing.md,
  },
  trackTitleRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  trackName: {
    fontFamily: font.bold,
    fontSize:   fontSize.base,
    color:      colors.textDark,
  },
  trackPct: {
    fontFamily: font.medium,
    fontSize:   fontSize.sm,
    color:      colors.brand,
  },
  trackMeta: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
    flexWrap:      'wrap',
  },
  topicName: {
    fontFamily: font.bold,
    fontSize:   fontSize.sm,
    color:      colors.brand,
  },
  positionLabel: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
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
  scenarioLabel: {
    fontFamily:    font.bold,
    fontSize:      fontSize.sm,
    color:         colors.brand,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  contentText: {
    fontFamily: font.regular,
    fontSize:   fontSize.base,
    color:      colors.textDark,
    lineHeight: fontSize.base * 1.6,
  },
  takeawayBlock: {
    borderLeftWidth:  4,
    borderLeftColor:  colors.brand,
    paddingLeft:      spacing.md,
    paddingVertical:  spacing.sm,
    backgroundColor:  colors.brandSoft,
    borderRadius:     4,
    gap:              spacing.xs,
  },
  takeawayLabel: {
    fontFamily:    font.bold,
    fontSize:      fontSize.sm,
    color:         colors.brand,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
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
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent:  'flex-end',
  },
  modalSheet: {
    backgroundColor:     colors.surface,
    borderTopLeftRadius:  20,
    borderTopRightRadius: 20,
    padding:              spacing.xl,
    gap:                  spacing.md,
    alignItems:           'center',
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
  dismissBtn:  { paddingVertical: spacing.sm },
  dismissText: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
    textAlign:  'center',
  },
  completedBanner: {
    backgroundColor: '#F0FDF4',
    borderRadius:    8,
    padding:         spacing.sm,
    alignItems:      'center',
  },
  completedBannerText: {
    fontFamily: font.bold,
    fontSize:   fontSize.base,
    color:      '#16A34A',
  },
  teasersRemaining: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
    textAlign:  'center',
  },
});
