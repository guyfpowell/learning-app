import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { isAxiosError } from 'axios';
import * as Sentry from '@sentry/react-native';
import type { ApiErrorResponse, PremiumRequiredDetails } from '@learning/shared';
import { colors, font, fontSize, levelCard, lineHeight, press, spacing, trackingEm } from '@/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PinnedAction, PINNED_ACTION_CLEARANCE } from '@/components/ui/PinnedAction';
import { EdgeButton } from '@/components/ui/EdgeButton';
import { HeroBackground } from '@/components/ui/HeroBackground';
import { KeyTakeawayBlock } from '@/components/ui/KeyTakeawayBlock';
import { LessonPositionHeader } from '@/components/learning/LessonPositionHeader';
import { LessonReading } from '@/components/learning/LessonReading';
import { CompletedLessonView } from '@/components/learning/CompletedLessonView';
import { PremiumSheet } from '@/components/ui/PremiumSheet';
import { LessonStatusLine } from '@/components/learning/LessonStatusLine';
import { Spinner } from '@/components/ui/Spinner';
import { LessonRatingControl } from '@/components/ui/LessonRatingControl';
import { QuizModal } from '@/components/QuizModal';
import { useLesson } from '@/hooks/useLesson';
import { useLessonClock } from '@/hooks/useLessonClock';
import { useDetailHeader } from '@/hooks/useDetailHeader';
import { lessonService } from '@/services/lesson.service';
import { usePaths } from '@/hooks/useTrack';
import { PAYWALL_ROUTE } from '@/lib/subscriptions';
import type { LessonPhase } from '@learning/shared';
import { PREMIUM_LESSON_BUDGET, lessonOpeningPhase } from '@learning/shared';
import { extractError } from '@/lib/errors';

/** The takeaway block is centred between the header and the button, then dropped this far below the centre. */
const TAKEAWAY_DROP = spacing.lg;

/** How far the takeaway page's text starts below the status bar: the transparent header's height. */
const TAKEAWAY_HEADER_CLEARANCE = 56;

/**
 * The lesson opens on the full text, never the summary-only step (096): the Home hero already shows the
 * summary. A saved 'collapsed' position (shared rule, still used by web) reads as 'expanded' here.
 */
function readingPhase(phase: LessonPhase): LessonPhase {
  return phase === 'collapsed' ? 'expanded' : phase;
}

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
    <PremiumSheet
      visible={visible}
      title={isLimit ? 'Free Preview Limit Reached' : 'Premium Content'}
      body={isLimit
        ? `You've used ${teasersUsed} of ${PREMIUM_LESSON_BUDGET} free previews. Upgrade to continue learning.`
        : 'This is premium content. Upgrade to unlock unlimited access to all lessons.'}
      onUpgrade={onUpgrade}
      onClose={onClose}
    >
      {isLimit && (
        <Text style={styles.teasersRemaining}>
          {teasersRemaining} free preview{teasersRemaining === 1 ? '' : 's'} remaining
        </Text>
      )}
    </PremiumSheet>
  );
}

export default function LessonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: lesson, isLoading, isError, error } = useLesson(id ?? '');
  const { data: paths } = usePaths();
  const [quizVisible, setQuizVisible] = useState(false);
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);
  const [phase, setPhase] = useState<LessonPhase>('expanded');
  const insets = useSafeAreaInsets();
  const retakeInProgress = !!lesson?.lessonRetakeInProgress;
  // A completed lesson (and not mid-retake) is looked back over, not read through: summary, lesson and quiz, one tap apart.
  const viewing = !!lesson?.quizCompleted && !retakeInProgress;
  // The takeaway page turns the whole screen cobalt (the 2026-11 design); without a takeaway it stays plain.
  const takeawayPage = !viewing && phase === 'takeaway' && !!lesson?.keyTakeaway;
  const position = lesson?.topicName && lesson.lessonIndex != null && lesson.totalLessons != null && lesson.totalLessons > 0
    ? { index: lesson.lessonIndex, total: lesson.totalLessons }
    : null;
  // No header title on the lesson page: the screen's own heading carries the lesson's name.
  // On the takeaway page the screen is named "Key takeaway"; over the colour the header shows where the lesson sits.
  const header = {
    // The header's centre says where the lesson sits: plain text over the takeaway's colour, with its segments on the page.
    ...(position ? { headerTitle: takeawayPage ? `Lesson ${position.index} of ${position.total}` : () => <LessonPositionHeader index={position.index} total={position.total} level={lesson?.skillPath?.level ?? 'intermediate'} /> } : {}),
    ...useDetailHeader(phase === 'takeaway' ? 'Key takeaway' : '', takeawayPage),
    headerTitleStyle: takeawayPage
      ? { fontFamily: font.bold, fontSize: fontSize.sm, color: colors.brandSoft }
      : { fontFamily: font.regular, fontSize: fontSize.md, color: colors.textMuted },
  };
  const clock = useLessonClock();

  // Guards against re-initialising phase after the user has manually transitioned
  const phaseInitialized = useRef<string | null>(null);


  // Fire-and-forget position write: a failure is silent to the user (spec constraint 6), never to us.
  function updatePosition(lessonId: string, p: LessonPhase) {
    lessonService.updatePosition(lessonId, p).catch((err) => {
      Sentry.addBreadcrumb({ category: 'lesson', message: 'Position save failed', level: 'warning', data: { lessonId, phase: p, err: String(err) } });
    });
  }

  // Where the reader opens, the same rule as web. Waits for paths: they carry the saved position.
  useEffect(() => {
    if (!lesson || !paths || phaseInitialized.current === lesson.id) return;
    const initial = readingPhase(lessonOpeningPhase(lesson, paths));
    setPhase(initial);
    phaseInitialized.current = lesson.id;
    updatePosition(lesson.id, initial);
  }, [lesson?.id, lesson?.quizCompleted, paths]);

  const showPremiumError = isError && isPremiumError(error);
  const showNotFound = isError && isNotFoundError(error);
  // The server's message or fixed copy, never the transport's own text ("Network Error").
  const lessonError = extractError(error);

  return (
    <SafeAreaView style={[styles.container, takeawayPage && styles.onColour]} edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={header} />
      {takeawayPage && (
        <>
          <StatusBar style="light" />
          <HeroBackground level="intermediate" testID="takeaway-colour" />
        </>
      )}
      <ScrollView contentContainerStyle={[styles.content, lesson && !viewing && styles.contentPinned, takeawayPage && [styles.contentOnColour, { paddingTop: insets.top + TAKEAWAY_HEADER_CLEARANCE + 2 * TAKEAWAY_DROP }]]}>

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
            <View testID="lesson-card" style={styles.card}>
              {viewing && (
                <LessonStatusLine
                  testID="lesson-completed-banner"
                  status="done"
                  color={levelCard[lesson.skillPath?.level ?? 'intermediate'].base}
                  text={position ? `Lesson ${position.index} of ${position.total} \u00B7 Completed` : 'Completed'}
                />
              )}
              {(viewing || phase !== 'takeaway' || lesson.quizCompleted) && (
                <View testID="lesson-title-row" style={[styles.titleRow, !viewing && phase === 'takeaway' && styles.titleRowEnd]}>
                  {(viewing || phase !== 'takeaway') && <Text testID="lesson-title" style={[styles.title, viewing && styles.titleViewing]}>{lesson.title}</Text>}
                  {lesson.quizCompleted && <LessonRatingControl lessonId={lesson.id} rating={lesson.rating ?? null} color={takeawayPage ? colors.white : undefined} />}
                </View>
              )}

              {viewing && (
                <CompletedLessonView lesson={lesson} />
              )}

              {!viewing && phase === 'expanded' && <LessonReading content={lesson.content} mediaUrl={lesson.mediaUrl} />}

              {takeawayPage && lesson.keyTakeaway && (
                <>
                  <Text style={styles.takeawayLabel}>KEY TAKEAWAY</Text>
                  <KeyTakeawayBlock testID="key-takeaway" takeaway={lesson.keyTakeaway} onColour />
                  {!!lesson.topicName && (
                    <>
                      <View style={styles.takeawayRule} />
                      <Text testID="takeaway-topic" style={styles.takeawayTopic}>{lesson.topicName}</Text>
                    </>
                  )}
                </>
              )}
            </View>

          </>
        )}

      </ScrollView>

      {/* The lesson's main action floats over the copy, which scrolls behind its glass (096). */}
      {lesson && !viewing && (
        <PinnedAction>
          {phase === 'expanded' && (
            <EdgeButton
              testID="key-takeaway-btn"
              look={{ face: colors.brand, label: colors.white, edge: press.primaryEdge }}
              label="Key takeaway"
              icon="next"
              onPress={() => {
                setPhase('takeaway');
                updatePosition(lesson.id, 'takeaway');
              }}
            />
          )}
          {phase === 'takeaway' && !takeawayPage && (
            <Button
              testID="lesson-quiz-btn"
              label="Test My Knowledge"
              variant="glass"
              size="lg"
              onPress={() => setQuizVisible(true)}
            />
          )}
          {takeawayPage && (
            <EdgeButton
              testID="lesson-quiz-btn"
              look={{ face: colors.white, label: colors.brand, edge: press.onCobaltEdge }}
              label="Test my knowledge"
              icon="next"
              onPress={() => setQuizVisible(true)}
            />
          )}
        </PinnedAction>
      )}

      {lesson && (
        <QuizModal
          visible={quizVisible}
          lesson={lesson}
          onClose={() => setQuizVisible(false)}
          completionTime={clock.seconds}
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
  // The takeaway page: the colour behind it is drawn by `HeroBackground`.
  onColour:  { backgroundColor: 'transparent' },
  content:   { padding: spacing.md, flexGrow: 1 },
  // The takeaway is large and centred on the page, a little below the middle.
  contentOnColour: { justifyContent: 'center', paddingHorizontal: spacing.lg, paddingBottom: PINNED_ACTION_CLEARANCE },
  // Leaves room under the last line for the pinned button (096).
  contentPinned: { paddingBottom: PINNED_ACTION_CLEARANCE },

  // Article, not a card: it sits on the page with the screen's margin plus a little.
  card: { gap: spacing.md, paddingHorizontal: spacing.sm },
  titleRow: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    justifyContent: 'space-between',
    gap:            spacing.sm,
  },
  title: {
    fontFamily:    font.extrabold,
    fontSize:      fontSize.xl,
    lineHeight:    fontSize.xl * lineHeight.snug,
    letterSpacing: trackingEm.title * fontSize.xl,
    color:         colors.textStrong,
    flex:          1,
  },
  takeawayLabel: { fontFamily: font.extrabold, fontSize: fontSize.xs + 1, letterSpacing: trackingEm.caps * (fontSize.xs + 1), color: colors.brandSoft },
  takeawayRule:  { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.3)', marginTop: spacing.sm },
  takeawayTopic: { fontFamily: font.medium, fontSize: fontSize.base - 1, color: colors.brandSoft },
  // The takeaway page has no title, so the rating control stays at the right edge on its own.
  titleRowEnd: { justifyContent: 'flex-end' },
  // The review page's title: 26pt, a touch smaller than the reading page's.
  titleViewing: { fontFamily: font.black, fontSize: 26, lineHeight: 26 * 1.08, letterSpacing: -0.035 * 26 },
  quizBtn:     { marginTop: spacing.sm },
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
  teasersRemaining: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
    textAlign:  'center',
  },
});
