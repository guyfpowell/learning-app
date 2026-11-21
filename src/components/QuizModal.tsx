import React, { useEffect, useState } from 'react';
import { Modal } from 'react-native';
import { useRouter } from 'expo-router';
import type { Lesson, QuizResult } from '@learning/shared';
import { shownResultOf } from '@learning/shared';
import { useSaveLesson, useUnsaveLesson } from '@/hooks/useLesson';
import { usePreloadLesson } from '@/hooks/usePreloadLesson';
import { useGoBack } from '@/hooks/useGoBack';
import { extractError } from '@/lib/errors';
import { BREADCRUMB_CATEGORY, warnBreadcrumb } from '@/lib/breadcrumbs';
import { HOME_ROUTE, lessonRoute } from '@/lib/routes';
import type { ResultFrameControls } from '@/components/quiz/QuizResultFrame';
import { RetryResultView } from '@/components/quiz/RetryResultView';
import { FeedbackResultView } from '@/components/quiz/FeedbackResultView';
import { FinalResultView } from '@/components/quiz/FinalResultView';
import { AlreadyCompletedView } from '@/components/quiz/AlreadyCompletedView';
import { QuizQuestionView } from '@/components/quiz/QuizQuestionView';
import { useQuizJourney } from '@/components/quiz/useQuizJourney';

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

/** The lesson a "Next lesson" button will open: the finished result on screen's, else the already-completed view's. */
function nextLessonToPreload(result: QuizResult | undefined, showingCompleted: boolean, lesson: Lesson): string | null | undefined {
  if (result) return result.nextLessonId;
  return showingCompleted ? lesson.nextLessonId : null;
}

function QuizViews({ visible, lesson, onClose, completionTime }: QuizModalProps) {
  const [isSaved, setIsSaved] = useState(false);
  const router = useRouter();
  const goBack = useGoBack(HOME_ROUTE);
  // Every learner's answer shows its result at once (ADR-027), from the endings fetched when the quiz opened.
  const journey = useQuizJourney({ lesson, visible, completionTime });
  const { instant, submit, alreadyCompleted, current } = journey;
  const saveLesson = useSaveLesson(lesson.id);
  const unsaveLesson = useUnsaveLesson(lesson.id);
  // "Next lesson" is on the finished result, or on the already-completed view; load it now (premium only).
  usePreloadLesson(nextLessonToPreload(shownResultOf(instant, submit.data), visible && alreadyCompleted, lesson));

  // Start again each time the modal opens, from the first unresolved question.
  useEffect(() => {
    if (!visible) return;
    journey.restart();
    setIsSaved(!!lesson.isSaved);
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

  switch (instant?.kind) {
    case 'retry':
      return <RetryResultView frame={frame} keyTakeaway={lesson.keyTakeaway} onTryAgain={journey.tryAgain} />;
    case 'feedback':
      return <FeedbackResultView frame={frame} fb={instant.answered.feedback} onNext={() => journey.advanceToNextUnresolved(current?.id)} />;
    case 'final':
      // The whole page at once from the matching ending; the reply then updates it in place.
      return (
        <FinalResultView
          result={shownResultOf(instant, submit.data)}
          correct={instant.correct}
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
      quizzes={lesson.quizzes}
      currentQuizIndex={journey.currentQuizIndex}
      selectedAnswer={journey.selectedAnswer}
      wrongAnswer={journey.wrongAnswer}
      submitError={submit.isError ? extractError(submit.error) : null}
      onToggleOption={journey.toggleOption}
      onChangeAnswer={journey.setSelectedAnswer}
      onSubmit={journey.submitAnswer}
      onClose={onClose}
    />
  );
}
