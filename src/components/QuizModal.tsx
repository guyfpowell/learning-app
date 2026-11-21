import React, { useEffect, useState } from 'react';
import { LayoutAnimation, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import type { Lesson, QuizResult } from '@learning/shared';
import { ERROR_CODES } from '@learning/shared';
import { useSubmitQuiz } from '@/hooks/useQuiz';
import { useSaveLesson, useUnsaveLesson } from '@/hooks/useLesson';
import { usePreloadLesson } from '@/hooks/usePreloadLesson';
import { useCurrentUser } from '@/hooks/useEmailVerification';
import { useRefreshLesson } from '@/hooks/useRefreshLesson';
import { useGoBack } from '@/hooks/useGoBack';
import { errorCode, extractError } from '@/lib/errors';
import { BREADCRUMB_CATEGORY, warnBreadcrumb } from '@/lib/breadcrumbs';
import { HOME_ROUTE, lessonRoute } from '@/lib/routes';
import type { ResultFrameControls } from '@/components/quiz/QuizResultFrame';
import { RetryResultView } from '@/components/quiz/RetryResultView';
import { FeedbackResultView } from '@/components/quiz/FeedbackResultView';
import { FinalResultView } from '@/components/quiz/FinalResultView';
import { AlreadyCompletedView } from '@/components/quiz/AlreadyCompletedView';
import { QuizQuestionView } from '@/components/quiz/QuizQuestionView';
import { answerViewOf, replyViewOf, type AnswerView } from '@/components/quiz/answerView';

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

/** The server already counts the lesson as finished, so the answer wasn't needed. */
function isLessonAlreadyCompleted(error: unknown): boolean {
  return errorCode(error) === ERROR_CODES.LESSON_ALREADY_COMPLETED;
}

function QuizViews({ visible, lesson, onClose, completionTime }: QuizModalProps) {
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | undefined>(undefined);
  const [wrongAnswer, setWrongAnswer] = useState<string | undefined>(undefined);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const router = useRouter();
  const goBack = useGoBack(HOME_ROUTE);
  const submit = useSubmitQuiz(lesson.id);
  const refreshLesson = useRefreshLesson(lesson.id);
  const { data: user } = useCurrentUser();
  // A premium user's answer shows its result at once (115e); a free user's waits for `submit.data`.
  const isPremium = user?.isPremium === true;
  const [instant, setInstant] = useState<AnswerView | null>(null);
  const saveLesson = useSaveLesson(lesson.id);
  const unsaveLesson = useUnsaveLesson(lesson.id);
  // "Next lesson" is on the finished result, or on the already-completed view; load it now (premium only).
  usePreloadLesson(nextLessonToPreload(submit.data, visible && alreadyCompleted, lesson));
  const quizzes = lesson.quizzes;

  /** Start the quiz from `source`, resuming at its first unresolved question. */
  function resumeFrom(source: Lesson) {
    const sourceQuizzes = source.quizzes;
    const resolved = new Set<string>(source.resolvedQuizIds ?? []);
    setResolvedIds(resolved);
    const finished = (!!source.quizCompleted && !source.lessonRetakeInProgress) || sourceQuizzes.every(q => resolved.has(q.id));
    setAlreadyCompleted(sourceQuizzes.length > 0 && finished);
    const startIdx = sourceQuizzes.findIndex(q => !resolved.has(q.id));
    setCurrentQuizIndex(startIdx === -1 ? 0 : startIdx);
    setSelectedAnswer(undefined);
    setWrongAnswer(undefined);
    setInstant(null);
  }

  // Reset state each time the modal opens; resume from first unresolved question. The finished
  // result's own state starts clean on its own: `submit.reset()` unmounts it.
  useEffect(() => {
    if (!visible) return;
    resumeFrom(lesson);
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
    setInstant(null);
    submit.reset();
  }

  /** The last answer did not finish the lesson: ask the server what it has, and resume the quiz from that. */
  async function resumeFromServer() {
    resumeFrom((await refreshLesson()) ?? lesson);
  }

  /**
   * A refused answer. An already-answered question advances (to "Already Completed" when none is
   * left). Any other failure: `resume` (a premium user's last answer) resumes from what the server
   * has; otherwise the question view shows `submit-error`.
   */
  function handleQuizError(error: unknown, resume: boolean) {
    if (isLessonAlreadyCompleted(error)) advanceToNextUnresolved(current?.id);
    else if (resume) void resumeFromServer();
  }

  function handleLastReply(reply: QuizResult) {
    if (!reply.lessonFinalized) void resumeFromServer();
  }

  function handleSubmit() {
    if (!current || !selectedAnswer) return;
    const input = {
      lessonId: lesson.id,
      answers: { [current.id]: selectedAnswer },
      ...(wrongAnswer !== undefined ? { isRetake: true } : {}),
      ...(completionTime ? { completionTime: completionTime() } : {}),
    };
    if (!isPremium) {
      submit.mutate(input, { onError: error => handleQuizError(error, false) });
      return;
    }
    // The result shows now; the answer is sent in the background, and only the last one's reply is acted on.
    const view = answerViewOf({ quiz: current, quizzes, answer: selectedAnswer, retake: wrongAnswer !== undefined, resolvedIds });
    setInstant(view);
    submit.mutate(input, view.kind === 'final' ? { onSuccess: handleLastReply, onError: error => handleQuizError(error, true) } : undefined);
  }

  function handleTryAgain() {
    setWrongAnswer(selectedAnswer);
    setSelectedAnswer(undefined);
    setInstant(null);
    submit.reset();
  }

  function handleNavigateAfterQuiz(nextId: string | null | undefined) {
    onClose();
    router.replace(nextId ? lessonRoute(nextId) : HOME_ROUTE);
  }

  /** ✕ on a finished quiz: leave the lesson for where it was opened from (Home if nowhere). */
  function handleLeaveLesson() {
    onClose();
    goBack();
  }

  const frame: ResultFrameControls = { onClose, saved: isSaved, onToggleSave: handleToggleSave };
  const view = isPremium ? instant : replyViewOf(submit.data, current?.id);

  switch (view?.kind) {
    case 'retry':
      return <RetryResultView frame={frame} keyTakeaway={lesson.keyTakeaway} onTryAgain={handleTryAgain} />;
    case 'feedback':
      return <FeedbackResultView frame={frame} fb={view.fb} onNext={() => advanceToNextUnresolved(current?.id)} />;
    case 'final':
      // The heading at once; the rest when the server's reply finalises the lesson.
      return (
        <FinalResultView
          result={submit.data?.lessonFinalized ? submit.data : undefined}
          correct={view.correct}
          lessonId={lesson.id}
          lessonRating={lesson.rating}
          saved={isSaved}
          onToggleSave={handleToggleSave}
          onLeave={handleLeaveLesson}
          onNavigate={handleNavigateAfterQuiz}
        />
      );
  }

  if (alreadyCompleted) {
    return <AlreadyCompletedView frame={{ ...frame, onClose: handleLeaveLesson }} lesson={lesson} onNavigate={handleNavigateAfterQuiz} />;
  }

  return (
    <QuizQuestionView
      quizzes={quizzes}
      currentQuizIndex={currentQuizIndex}
      selectedAnswer={selectedAnswer}
      wrongAnswer={wrongAnswer}
      submitError={submit.isError ? extractError(submit.error) : null}
      submitting={!isPremium && submit.isPending}
      onToggleOption={handleToggleOption}
      onChangeAnswer={setSelectedAnswer}
      onSubmit={handleSubmit}
      onClose={onClose}
    />
  );
}
