import React, { useEffect, useState } from 'react';
import { LayoutAnimation, Modal, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Lesson, QuizFeedback, QuizResult } from '@learning/shared';
import { ERROR_CODES } from '@learning/shared';
import { Text } from '@/components/ui/Text';
import { useSubmitQuiz } from '@/hooks/useQuiz';
import { useSaveLesson, useUnsaveLesson } from '@/hooks/useLesson';
import { usePreloadLesson } from '@/hooks/usePreloadLesson';
import { errorCode, extractError } from '@/lib/errors';
import { BREADCRUMB_CATEGORY, warnBreadcrumb } from '@/lib/breadcrumbs';
import { HOME_ROUTE, lessonRoute } from '@/lib/routes';
import { EdgeButton } from '@/components/ui/EdgeButton';
import { Icon } from '@/components/ui/Icon';
import { LessonRatingControl } from '@/components/ui/LessonRatingControl';
import { Reveal, revealDelay } from '@/components/ui/Reveal';
import { QuizFeedbackCard } from '@/components/quiz/QuizFeedbackCard';
import { QuizResultFrame } from '@/components/quiz/QuizResultFrame';
import { HintSection } from '@/components/quiz/ResultSections';
import { ResultButton } from '@/components/quiz/ResultButton';
import { ResultHeading } from '@/components/quiz/ResultHeading';
import { FinalResultView } from '@/components/quiz/FinalResultView';
import { QuizQuestionView } from '@/components/quiz/QuizQuestionView';
import { nextLessonLabel } from '@/components/quiz/nextLessonLabel';
import type { ResultTone } from '@/components/quiz/resultTone';
import { colors, font, fontSize, press, results, spacing } from '@/theme';

interface QuizModalProps {
  visible: boolean;
  /** Its `lessonRetakeInProgress` keeps a completed lesson mid-retake out of "Already Completed" (079e). */
  lesson: Lesson;
  onClose: () => void;
  /** Foreground seconds on the lesson flow so far (079e); sent with every submission. */
  completionTime?: () => number;
}

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

/** How the answers and Submit come and go when an answer is picked or cleared: quick off the mark, then slowing into place. */
const PICK_ANIMATION = LayoutAnimation.create(420, LayoutAnimation.Types.easeOut, LayoutAnimation.Properties.opacity);

/** The lesson a "Next lesson" button will open: the finished result's, else the already-completed view's. */
function nextLessonToPreload(result: QuizResult | undefined, showingCompleted: boolean, lesson: Lesson): string | null | undefined {
  if (result?.lessonFinalized) return result.nextLessonId;
  return showingCompleted ? lesson.nextLessonId : null;
}

function QuizViews({ visible, lesson, onClose, completionTime }: QuizModalProps) {
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | undefined>(undefined);
  const [wrongAnswer, setWrongAnswer] = useState<string | undefined>(undefined);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const router = useRouter();
  const submit = useSubmitQuiz(lesson.id);
  const saveLesson = useSaveLesson(lesson.id);
  const unsaveLesson = useUnsaveLesson(lesson.id);
  // "Next lesson" is on the finished result, or on the already-completed view; load it now (premium only).
  usePreloadLesson(nextLessonToPreload(submit.data, visible && alreadyCompleted, lesson));
  const quizzes = lesson.quizzes;

  // Reset state each time the modal opens; resume from first unresolved question. The finished
  // result's own state starts clean on its own: `submit.reset()` unmounts it.
  useEffect(() => {
    if (!visible) return;
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
  }, [visible, lesson.id, lesson.isSaved]);

  function handleToggleSave() {
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    const onError = (err: unknown) => {
      warnBreadcrumb(BREADCRUMB_CATEGORY.lesson, 'Save toggle failed; reverted', err, { saved: nextSaved });
      setIsSaved(!nextSaved);
    };
    (nextSaved ? saveLesson : unsaveLesson).mutate({ lessonId: lesson.id }, { onError });
  }

  const current = quizzes[currentQuizIndex];

  /** A multiple-choice answer is a toggle: pressing the picked one clears it. */
  function handleToggleOption(option: string) {
    // The other answers and Submit fade and the list closes up, rather than snapping.
    LayoutAnimation.configureNext(PICK_ANIMATION);
    setSelectedAnswer(picked => (picked === option ? undefined : option));
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
    router.replace(nextId ? lessonRoute(nextId) : HOME_ROUTE);
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
    return (
      <FinalResultView
        result={submit.data}
        lessonId={lesson.id}
        retakeUsed={wrongAnswer !== undefined}
        saved={isSaved}
        onToggleSave={handleToggleSave}
        onLeave={handleLeaveLesson}
        onNavigate={handleNavigateAfterQuiz}
      />
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
            label={nextLessonLabel(lesson.nextLessonId)}
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

  // ─── Quiz view ───────────────────────────────────────────────────────────────
  return (
    <QuizQuestionView
      quizzes={quizzes}
      currentQuizIndex={currentQuizIndex}
      selectedAnswer={selectedAnswer}
      wrongAnswer={wrongAnswer}
      submitError={submit.isError ? extractError(submit.error) : null}
      submitting={submit.isPending}
      onToggleOption={handleToggleOption}
      onChangeAnswer={setSelectedAnswer}
      onSubmit={handleSubmit}
      onClose={onClose}
    />
  );
}

const styles = StyleSheet.create({
  nudge:    { fontFamily: font.medium, fontSize: fontSize.md, marginTop: spacing.xs },
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
  resultHeading: {
    fontFamily:    font.black,
    fontSize:      32,
    lineHeight:    32 * 1.05,
    letterSpacing: -0.035 * 32,
    color:         colors.textStrong,
    textAlign:     'center',
  },
});
