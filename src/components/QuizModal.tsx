import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, LayoutAnimation, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { AchievementKey, Lesson, QuizFeedback } from '@learning/shared';
import { ACHIEVEMENTS_BY_KEY, ERROR_CODES } from '@learning/shared';
import * as Sentry from '@sentry/react-native';
import { useSubmitQuiz } from '@/hooks/useQuiz';
import { useSaveLesson, useUnsaveLesson } from '@/hooks/useLesson';
import { useRefreshPaths, useTopicFeedback } from '@/hooks/useTrack';
import { TopicFeedback } from '@/components/ui/TopicFeedback';
import { errorCode, extractError } from '@/lib/errors';
import { EdgeButton } from '@/components/ui/EdgeButton';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { LessonRatingControl } from '@/components/ui/LessonRatingControl';
import { QuizOpt } from '@/components/ui/QuizOpt';
import type { QuizOptState } from '@/components/ui/QuizOpt';
import { colors, font, fontSize, lineHeight, press, radius, results, spacing, trackingEm } from '@/theme';
import { XpChipOverlay, type ScreenRect } from '@/components/ui/CelebrationOverlay';
import { AchievementUnlock } from '@/components/quiz/AchievementUnlock';
import { QuizFeedbackCard } from '@/components/quiz/QuizFeedbackCard';
import { PinnedAction, PINNED_ACTION_CLEARANCE } from '@/components/ui/PinnedAction';
import { CIRCLE_BUTTON_SIZE } from '@/components/ui/circleButtonStyle';
import { QuizHeroCard } from '@/components/quiz/QuizHeroCard';
import { QuizResultFrame, quizFrameStyles, frameContentStyle, headerRowBox } from '@/components/quiz/QuizResultFrame';
import { HintSection, VerdictMark } from '@/components/quiz/ResultSections';
import { ResultButton } from '@/components/quiz/ResultButton';
import type { ResultTone } from '@/components/quiz/resultTone';
import { CoachingCard, MilestoneCard, TrackAverageBadge, XpAward } from '@/components/quiz/QuizResultParts';
import { Reveal, revealDelay } from '@/components/ui/Reveal';
import { HOME_ROUTE, lessonRoute } from '@/lib/routes';
import { nextFeedbackPhrase } from '@/lib/quizFeedbackPhrase';

interface QuizModalProps {
  visible: boolean;
  /** Its `lessonRetakeInProgress` keeps a completed lesson mid-retake out of "Already Completed" (079e). */
  lesson: Lesson;
  onClose: () => void;
  /** Foreground seconds on the lesson flow so far (079e); sent with every submission. */
  completionTime?: () => number;
}

type CelebrationItem = { type: 'xp'; id: string; amount: number };

/**
 * One Modal for the whole quiz journey. The question and result views swap inside it, so
 * passing the quiz never dismisses one modal and presents another.
 */
export function QuizModal(props: QuizModalProps) {
  return (
    <Modal visible={props.visible} animationType="slide" onRequestClose={props.onClose}>
      <QuizViews {...props} />
    </Modal>
  );
}

// A correct heading bursts in from far behind the screen, overshoots, then a springy pull settles it.
// It is left-aligned at rest: it expands from the left into the centre of the screen, then back to the left.
/** How the answers and Submit come and go when an answer is picked or cleared: quick off the mark, then slowing into place. */
const PICK_ANIMATION = LayoutAnimation.create(420, LayoutAnimation.Types.easeOut, LayoutAnimation.Properties.opacity);

/** Extra room under the last answer, so a picked one (cobalt) does not sit tight against the cobalt Submit at the end of the scroll. */
const QUESTION_BOTTOM_AIR = spacing.md;

const HEADING_START_SCALE = 0.05;
const HEADING_BURST_SCALE = 1.7;
const HEADING_BURST_MS = 260;
const HEADING_FADE_MS = 120;
const HEADING_SETTLE_MS = 400;

/** How far right of the left edge a heading of `textWidth`, scaled from its left edge, sits centred in `boxWidth`. */
export function burstShift(boxWidth: number, textWidth: number, scale: number): number {
  return (boxWidth - scale * textWidth) / 2;
}

function useHeadingBurst(enabled: boolean, boxWidth: number, textWidth: number) {
  const scale = useRef(new Animated.Value(enabled ? HEADING_START_SCALE : 1)).current;
  const settle = useRef(new Animated.Value(enabled ? 0 : 1)).current;
  const opacity = useRef(new Animated.Value(enabled ? 0 : 1)).current;
  const started = useRef(false);
  const measured = boxWidth > 0 && textWidth > 0;
  useEffect(() => {
    if (!enabled || !measured || started.current) return;
    started.current = true;
    const burst = Animated.sequence([
      Animated.timing(scale, {
        toValue: HEADING_BURST_SCALE,
        duration: HEADING_BURST_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
        Animated.timing(settle, { toValue: 1, duration: HEADING_SETTLE_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]);
    const fade = Animated.timing(opacity, { toValue: 1, duration: HEADING_FADE_MS, useNativeDriver: true });
    Animated.parallel([burst, fade]).start();
  }, [enabled, measured, scale, settle, opacity]);
  if (!enabled) return undefined;
  // While bursting the text is centred; `settle` carries it back to the left edge as the scale returns to 1.
  const centred = scale.interpolate({
    inputRange: [0, 2],
    outputRange: [burstShift(boxWidth, textWidth, 0), burstShift(boxWidth, textWidth, 2)],
  });
  const left = settle.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  return { opacity, transformOrigin: 'left center', transform: [{ translateX: Animated.multiply(left, centred) }, { scale }] };
}

/** The verdict screen's top: the verdict mark, the headline, then whatever sits under it (XP, average, a nudge). */
function ResultHeading({ tone, children }: { tone: ResultTone; children?: React.ReactNode }) {
  const correct = tone === 'correct';
  // The phrase is picked once when a result screen appears, so a re-render never changes the word.
  const [phrase] = useState(() => nextFeedbackPhrase(correct));
  const [boxWidth, setBoxWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const burst = useHeadingBurst(correct, boxWidth, textWidth);
  return (
    <View testID="result-headline" style={styles.verdictTop} onLayout={e => setBoxWidth(e.nativeEvent.layout.width)}>
      <VerdictMark tone={tone} />
      <Animated.Text
        testID="result-heading"
        style={[styles.verdictHeading, { color: results[tone].fg }, burst]}
        numberOfLines={1}
        adjustsFontSizeToFit
        onLayout={e => setTextWidth(prev => prev || e.nativeEvent.layout.width)}
      >
        {phrase}
      </Animated.Text>
      {children}
    </View>
  );
}

function QuizViews({ visible, lesson, onClose, completionTime }: QuizModalProps) {
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | undefined>(undefined);
  const [wrongAnswer, setWrongAnswer] = useState<string | undefined>(undefined);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [, setCelebrationQueue] = useState<CelebrationItem[]>([]);
  // The achievements just earned, shown one at a time from the result's "See achievement" button.
  const [unlockedKeys, setUnlockedKeys] = useState<AchievementKey[]>([]);
  /** Which unlock screen is up (null: the result itself), and whether they have all been seen or skipped. */
  const [unlockStep, setUnlockStep] = useState<number | null>(null);
  const [unlocksDone, setUnlocksDone] = useState(false);
  const [currentCelebration, setCurrentCelebration] = useState<CelebrationItem | null>(null);
  // Where the XP chip sits on the screen, so the XP animation can fly back onto it.
  const [xpRect, setXpRect] = useState<ScreenRect | null>(null);
  const [topicFeedbackClosed, setTopicFeedbackClosed] = useState(false);
  const celebrationFired = useRef(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const submit = useSubmitQuiz();
  const saveLesson = useSaveLesson();
  const unsaveLesson = useUnsaveLesson();
  const topicFeedback = useTopicFeedback();
  const refreshPaths = useRefreshPaths();
  const quizzes = lesson.quizzes;
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const milestoneAnim = useRef(new Animated.Value(0.8)).current;

  // Reset state each time the modal opens; resume from first unresolved question
  useEffect(() => {
    if (visible) {
      const resolved = new Set<string>(lesson.resolvedQuizIds ?? []);
      setResolvedIds(resolved);
      const allResolved = quizzes.length > 0 && quizzes.every(q => resolved.has(q.id));
      setAlreadyCompleted(quizzes.length > 0 && ((!!lesson.quizCompleted && !lesson.lessonRetakeInProgress) || allResolved));
      const startIdx = quizzes.findIndex(q => !resolved.has(q.id));
      setCurrentQuizIndex(startIdx === -1 ? 0 : startIdx);
      setSelectedAnswer(undefined);
      setWrongAnswer(undefined);
      setIsSaved(!!lesson.isSaved);
      submit.reset();
      scoreAnim.setValue(0);
      milestoneAnim.setValue(0.8);
      setCelebrationQueue([]);
      setCurrentCelebration(null);
      setUnlockedKeys([]);
      setUnlockStep(null);
      setUnlocksDone(false);
      setTopicFeedbackClosed(false);
      celebrationFired.current = false;
    }
  }, [visible, lesson.id, lesson.isSaved]);

  function handleToggleSave() {
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    const onError = (err: unknown) => {
      Sentry.addBreadcrumb({
        category: 'lesson',
        message: 'Save toggle failed; reverted',
        level: 'warning',
        data: { err: String(err), saved: nextSaved },
      });
      setIsSaved(!nextSaved);
    };
    (nextSaved ? saveLesson : unsaveLesson).mutate(lesson.id, { onError });
  }

  // Animate score and milestone card only at lesson finalization
  useEffect(() => {
    if (submit.data?.lessonFinalized) {
      Animated.spring(scoreAnim, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }).start();
      if (submit.data.milestone) {
        Animated.spring(milestoneAnim, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }).start();
      }
    }
  }, [submit.data]);

  // Build celebration queue on finalization — fires exactly once per quiz session
  useEffect(() => {
    if (!submit.data?.lessonFinalized || celebrationFired.current) return;
    celebrationFired.current = true;
    const items: CelebrationItem[] = [];
    const unlocked: AchievementKey[] = submit.data.achievementsUnlocked ?? [];
    setUnlockedKeys(unlocked.filter(key => ACHIEVEMENTS_BY_KEY[key]));
    if (submit.data.xpAwarded != null && submit.data.xpAwarded > 0) {
      items.push({ type: 'xp', id: 'xp-award', amount: submit.data.xpAwarded });
    }
    if (items.length > 0) {
      setCurrentCelebration(items[0]);
      setCelebrationQueue(items.slice(1));
    }
  }, [submit.data]);

  function advanceCelebration() {
    setCelebrationQueue(q => {
      if (q.length > 0) {
        setCurrentCelebration(q[0]);
        return q.slice(1);
      }
      setCurrentCelebration(null);
      return [];
    });
  }

  const current = quizzes[currentQuizIndex];

  function renderOptions(options: string[]) {
    // On the second try the ruled-out answer drops to the bottom. Its testID keeps its original place.
    // Once one is picked it is the only one shown; picking it again brings the rest back.
    const ordered = options.filter(option => option !== wrongAnswer).concat(options.filter(option => option === wrongAnswer));
    const shown = selectedAnswer === undefined ? ordered : ordered.filter(option => option === selectedAnswer);
    return (
      <View style={[styles.options, selectedAnswer !== undefined && styles.optionsPicked]}>
        {shown.map(option => {
          let state: QuizOptState = 'idle';
          if (wrongAnswer === option) state = 'ruledOut';
          else if (selectedAnswer === option) state = 'selected';
          return (
            <QuizOpt
              key={option}
              testID={`quiz-opt-${options.indexOf(option)}`}
              label={option}
              state={state}
              onPress={() => handleToggleOption(option)}
            />
          );
        })}
      </View>
    );
  }

  function handleSelectOption(option: string) {
    setSelectedAnswer(option);
  }

  /** A multiple-choice answer is a toggle: pressing the picked one clears it. */
  function handleToggleOption(option: string) {
    // The other answers and Submit fade and the list closes up, rather than snapping.
    LayoutAnimation.configureNext(PICK_ANIMATION);
    setSelectedAnswer(current => (current === option ? undefined : option));
  }

  // Advance to the next question that has not yet been resolved.
  // If none remains, the lesson is already fully resolved server-side — show
  // the "already completed" view instead of silently re-showing a dead question.
  function advanceToNextUnresolved(justResolvedId?: string) {
    const newResolved = new Set(resolvedIds);
    if (justResolvedId) newResolved.add(justResolvedId);
    setResolvedIds(newResolved);
    const nextIdx = quizzes.findIndex((q, i) => i > currentQuizIndex && !newResolved.has(q.id));
    if (nextIdx === -1) {
      setAlreadyCompleted(true);
    } else {
      setCurrentQuizIndex(nextIdx);
    }
    setSelectedAnswer(undefined);
    setWrongAnswer(undefined);
    submit.reset();
  }

  // An already-answered question advances instead of erroring; anything else shows `submit-error`.
  function handleQuizError(error: unknown) {
    if (errorCode(error) === ERROR_CODES.LESSON_ALREADY_COMPLETED) {
      advanceToNextUnresolved(current?.id);
    }
  }

  function handleSubmit() {
    if (!current || !selectedAnswer) return;
    const answers: Record<string, string> = { [current.id]: selectedAnswer };
    submit.mutate(
      {
        lessonId: lesson.id,
        answers,
        ...(wrongAnswer !== undefined ? { isRetake: true } : {}),
        ...(completionTime ? { completionTime: completionTime() } : {}),
      },
      { onError: handleQuizError }
    );
  }

  function handleTryAgain() {
    setWrongAnswer(selectedAnswer);
    setSelectedAnswer(undefined);
    submit.reset();
  }

  function handleNavigateAfterQuiz(nextId: string | null | undefined) {
    onClose();
    if (nextId) {
      router.replace(lessonRoute(nextId));
    } else {
      router.replace(HOME_ROUTE);
    }
  }

  /** ✕ on a finished quiz: leave the lesson for where it was opened from (Home if nowhere). */
  function handleLeaveLesson() {
    onClose();
    if (router.canGoBack()) router.back();
    else router.replace(HOME_ROUTE);
  }

  const frame = { onClose, saved: isSaved, onToggleSave: handleToggleSave };

  // ─── Wrong first attempt — retry offer ("Try again") ─────────────────────────
  if (submit.data && !submit.data.correct && submit.data.retakeAvailable) {
    return (
      <QuizResultFrame
        {...frame}
        tone="retry"
        closable={false}
        action={<ResultButton testID="result-action-btn" tone="retry" label="Try again" icon="retake" onPress={handleTryAgain} />}
      >
        <ResultHeading tone="retry">
          <Text style={[styles.nudge, { color: results.retry.tint }]}>Have another go. Here's a nudge.</Text>
        </ResultHeading>
        {lesson.keyTakeaway && <Reveal delay={revealDelay(0)}><HintSection tone="retry" text={lesson.keyTakeaway} /></Reveal>}
      </QuizResultFrame>
    );
  }

  // ─── Per-question feedback — mid-capstone, lesson not yet finalized ───────────
  if (submit.data && !submit.data.lessonFinalized) {
    const fb = submit.data.feedbacks.find((f: QuizFeedback) => f.quizId === current?.id) ?? submit.data.feedbacks[0];
    const tone: ResultTone = fb?.isCorrect === true ? 'correct' : 'incorrect';
    return (
      <QuizResultFrame
        {...frame}
        tone={tone}
        action={<ResultButton testID="result-action-btn" tone={tone} label="Next question" icon="next" onPress={() => advanceToNextUnresolved(current?.id)} />}
      >
        <ResultHeading tone={tone} />
        {fb && <Reveal delay={revealDelay(0)}><QuizFeedbackCard fb={fb} tone={tone} /></Reveal>}
      </QuizResultFrame>
    );
  }

  // ─── Terminal / results view — lesson finalized ───────────────────────────────
  if (submit.data) {
    const { feedbacks, coaching, streak, milestone, trackAverage, previousAverage, xpAwarded, nextLessonId } = submit.data;
    const retakeUsed = wrongAnswer !== undefined;
    const tone: ResultTone = submit.data.correct ? 'correct' : 'incorrect';
    const topicEnd = topicFeedbackClosed ? null : submit.data.topicEnd;
    // Where the page's tail (topic feedback and the button) comes in: after every block above it.
    const tailStep = feedbacks.length + (coaching ? 1 : 0);
    const celebration = (
      <>
        {currentCelebration?.type === 'xp' && (
          <XpChipOverlay
            key={currentCelebration.id}
            visible
            xp={currentCelebration.amount}
            anchor={headerRowBox(insets.top)}
            returnTo={xpRect}
            onDismiss={advanceCelebration}
          />
        )}
        {unlockStep !== null && unlockedKeys[unlockStep] && (
          // Over the result, which stays mounted underneath so coming back does not replay it.
          <View style={StyleSheet.absoluteFill}>
            <AchievementUnlock key={unlockedKeys[unlockStep]} achievement={unlockedKeys[unlockStep]} onContinue={continueUnlocks} />
          </View>
        )}
      </>
    );
    const unlocksPending = unlockedKeys.length > 0 && !unlocksDone;
    function continueUnlocks() {
      if (unlockStep !== null && unlockStep + 1 < unlockedKeys.length) {
        setUnlockStep(unlockStep + 1);
        return;
      }
      setUnlockStep(null);
      setUnlocksDone(true);
    }
    return (
      <QuizResultFrame
        {...frame}
        onClose={handleLeaveLesson}
        overlay={celebration}
        tone={tone}
        action={unlocksPending ? (
          // Earned achievements come before the way on: view them one by one, or skip them.
          <View style={styles.unlockActions}>
            <Pressable testID="achievements-skip-btn" accessibilityRole="button" onPress={() => setUnlocksDone(true)} style={styles.skipTouch}>
              <Text style={[styles.skip, { color: results[tone].tint }]}>Skip</Text>
            </Pressable>
            <View style={styles.unlockButton}>
              <ResultButton
                testID="result-action-btn"
                tone={tone}
                label={unlockedKeys.length === 1 ? 'See achievement' : `See ${unlockedKeys.length} achievements`}
                icon="next"
                onPress={() => setUnlockStep(0)}
              />
            </View>
          </View>
        ) : (
          <ResultButton
            testID="result-action-btn"
            tone={tone}
            label={nextLessonId ? 'Next lesson' : 'Back to dashboard'}
            icon="next"
            onPress={() => handleNavigateAfterQuiz(nextLessonId)}
          />
        )}
        /* 079f: the result's lesson carries the stored verdict, so no refetch. */
        rating={<LessonRatingControl lessonId={lesson.id} rating={submit.data.lesson.rating ?? null} color={results[tone].fg} />}
      >
        <ResultHeading tone={tone}>
          <View style={styles.statsRow}>
            {xpAwarded != null && xpAwarded > 0 && <XpAward xp={xpAwarded} tone={tone} onMeasure={setXpRect} />}
            <Animated.View style={{ transform: [{ scale: scoreAnim }] }}>
              <TrackAverageBadge average={trackAverage} previous={previousAverage} retakeUsed={retakeUsed} tone={tone} />
            </Animated.View>
          </View>
        </ResultHeading>
        {milestone && <MilestoneCard milestone={milestone} streak={streak} scale={milestoneAnim} />}
        {/* The rest arrives block by block, after the heading (096, experiment 53). */}
        {feedbacks.map((fb: QuizFeedback, i: number) => (
          <Reveal key={fb.quizId} delay={revealDelay(i)}><QuizFeedbackCard fb={fb} tone={tone} showQuestion={feedbacks.length > 1} /></Reveal>
        ))}
        {coaching && <Reveal delay={revealDelay(feedbacks.length)}><CoachingCard coaching={coaching} /></Reveal>}
        {/* End-of-topic feedback (079d). Closing hides it here only: the write already
            happened, so Home will not show it again; one never written comes back on Home. */}
        <Reveal delay={revealDelay(tailStep)}>
          {topicEnd && (
            // The screen is drawn for paper, so on a verdict colour it sits on a paper panel.
            <View style={styles.topicFeedbackPanel}>
              <TopicFeedback
                topicEnd={topicEnd}
                onSubmit={body => topicFeedback.submit(topicEnd.planId, body)}
                onClose={() => { setTopicFeedbackClosed(true); refreshPaths(); }}
              />
            </View>
          )}
        </Reveal>
      </QuizResultFrame>
    );
  }

  // ─── Already completed — no unresolved question left, and no fresh result to show ──
  if (alreadyCompleted) {
    return (
      <QuizResultFrame
        {...frame}
        onClose={handleLeaveLesson}
        rating={lesson.quizCompleted ? <LessonRatingControl lessonId={lesson.id} rating={lesson.rating ?? null} /> : undefined}
        action={
          <EdgeButton
            testID="result-action-btn"
            look={{ face: colors.brand, label: colors.white, edge: press.primaryEdge }}
            label={lesson.nextLessonId ? 'Next lesson' : 'Back to dashboard'}
            icon="next"
            onPress={() => handleNavigateAfterQuiz(lesson.nextLessonId)}
          />
        }
      >
        <View style={styles.completedBlock}>
          <View style={styles.completedTile}>
            <Icon name="check" size={30} color={colors.textStrong} strokeWidth={2.6} />
          </View>
          <Text style={styles.resultHeading}>Already Completed</Text>
          <Text style={styles.completedBody}>You've already finished this lesson's quiz.</Text>
        </View>
      </QuizResultFrame>
    );
  }

  const pickedChoice = current?.type === 'multiple-choice' && selectedAnswer !== undefined;

  // ─── Quiz view ───────────────────────────────────────────────────────────────
  return (
      <View style={styles.container}>
        {/* The question view has no bookmark: the spacer keeps the close button right-aligned. */}
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <View style={styles.headerRow}>
            <View style={styles.spacer} />
            <View style={styles.headerCentre} pointerEvents="none">
              <Text style={styles.headerTitle}>Test my knowledge</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close quiz">
              <Ionicons name="close" size={22} color={colors.textStrong} />
            </Pressable>
          </View>
        </View>

        <ScrollView testID="quiz-question-content" contentContainerStyle={[...frameContentStyle(insets.bottom), quizzes.length > 0 && { paddingBottom: PINNED_ACTION_CLEARANCE + QUESTION_BOTTOM_AIR + insets.bottom }, pickedChoice && styles.contentGrow]}>
          {quizzes.length === 0 ? (
            <Text style={styles.empty}>No quiz available for this lesson.</Text>
          ) : (
            <>
              {wrongAnswer !== undefined && current.type === 'multiple-choice' && (
                <View testID="second-try-note" style={styles.secondTry}>
                  <Icon name="retake" size={fontSize.md} color={colors.xpText} />
                  <Text style={styles.secondTryText}>Retry</Text>
                </View>
              )}
              <QuizHeroCard
                question={current.question}
                progress={quizzes.length > 1 ? { index: currentQuizIndex, total: quizzes.length } : undefined}
              />

              {current.type === 'multiple-choice' ? (
                renderOptions(current.options)
              ) : (
                <Input
                  placeholder="Your answer..."
                  value={selectedAnswer ?? ''}
                  onChangeText={handleSelectOption}
                  style={styles.shortAnswerInput}
                />
              )}

              {submit.isError && (
                <Text testID="submit-error" style={styles.error}>{extractError(submit.error)}</Text>
              )}

            </>
          )}
        </ScrollView>

        {/* Submit floats over the question, which scrolls behind it. A multiple-choice question shows it only once an answer is picked; a typed answer keeps it, grey until something is typed. */}
        {quizzes.length > 0 && (current.type !== 'multiple-choice' || !!selectedAnswer) && (
          <PinnedAction>
            <EdgeButton
              testID="submit-btn"
              look={{ face: colors.brand, label: colors.white, edge: press.primaryEdge }}
              disabledLook={{ face: colors.border, label: colors.textSubtle }}
              label="Submit"
              onPress={handleSubmit}
              loading={submit.isPending}
              disabled={!selectedAnswer}
            />
          </PinnedAction>
        )}
      </View>
  );
}

const styles = StyleSheet.create({
  ...quizFrameStyles,
  spacer:    { width: 32 },
  headerTitle: { fontFamily: font.bold, fontSize: fontSize.sm, color: colors.textMuted },
  // Over the plain page the close button is a bare cross, not a box.
  closeBtn: { width: CIRCLE_BUTTON_SIZE, height: CIRCLE_BUTTON_SIZE, alignItems: 'center', justifyContent: 'center' },
  secondTry: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  secondTryText: { fontFamily: font.bold, fontSize: fontSize.sm, color: colors.xpText },
  contentGrow: { flexGrow: 1 },
  unlockActions: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  unlockButton: { flex: 1 },
  skipTouch: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 6 },
  skip: { fontFamily: font.bold, fontSize: 15 },
  topicFeedbackPanel: { padding: spacing.lg, backgroundColor: colors.paper, borderRadius: radius.xl },
  options:  { gap: spacing.sm3, marginBottom: spacing.lg },
  // The one picked answer sits midway between the question and Submit.
  optionsPicked: { flex: 1, justifyContent: 'center', marginBottom: 0 },
  shortAnswerInput:   { marginBottom: spacing.lg },
  error: {
    fontFamily:   font.regular,
    fontSize:     fontSize.sm,
    color:        colors.error,
    marginBottom: spacing.sm,
  },
  empty: {
    fontFamily: font.regular,
    fontSize:   fontSize.base,
    color:      colors.textMuted,
    textAlign:  'center',
    marginTop:  spacing.xl,
  },
  // The message sits centred in the space above the pinned button.
  completedBlock: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: spacing.lg, paddingBottom: 90 },
  completedTile:  { width: 64, height: 64, borderRadius: 22, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  completedBody: {
    fontFamily: font.regular,
    fontSize:   17,
    lineHeight: 17 * 1.45,
    color:      colors.textBody,
    textAlign:  'center',
    maxWidth:   280,
  },
  verdictTop:     { gap: spacing.sm3, marginTop: spacing.lg, marginBottom: spacing.md },
  verdictHeading: {
    alignSelf:     'flex-start',
    maxWidth:      '100%',
    fontFamily:    font.display,
    fontSize:      fontSize.hero,
    lineHeight:    fontSize.hero * lineHeight.tight,
    letterSpacing: trackingEm.display * fontSize.hero,
  },
  statsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm3 },
  nudge:    { fontFamily: font.medium, fontSize: fontSize.md, marginTop: spacing.xs },
  resultHeading: {
    fontFamily:    font.black,
    fontSize:      32,
    lineHeight:    32 * 1.05,
    letterSpacing: -0.035 * 32,
    color:         colors.textStrong,
    textAlign:     'center',
  },
});
