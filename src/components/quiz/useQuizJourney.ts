import { useState } from 'react';
import { LayoutAnimation } from 'react-native';
import type { AnswerView, Lesson, QuizResult, VisitAnswers } from '@learning/shared';
import { ERROR_CODES, answerViewOf } from '@learning/shared';
import { useSubmitQuiz } from '@/hooks/useQuiz';
import { useQuizOutcomes } from '@/hooks/useQuizOutcomes';
import { useRefreshLesson } from '@/hooks/useRefreshLesson';
import { errorCode } from '@/lib/errors';

/** How the answers and Submit come and go when an answer is picked or cleared: quick off the mark, then slowing into place. */
const PICK_ANIMATION = LayoutAnimation.create(420, LayoutAnimation.Types.easeOut, LayoutAnimation.Properties.opacity);

/** The server already counts the lesson as finished, so the answer wasn't needed. */
function isLessonAlreadyCompleted(error: unknown): boolean {
  return errorCode(error) === ERROR_CODES.LESSON_ALREADY_COMPLETED;
}

interface QuizJourneyOptions {
  lesson: Lesson;
  /** The quiz is open: the endings are fetched while it is. */
  visible: boolean;
  /** Foreground seconds on the lesson flow so far (079e); sent with every submission. */
  completionTime?: () => number;
}

/**
 * The quiz from the first question to the last answer: where it is, what is picked, the answer's view
 * (worked out at once for every learner, ADR-027, from the endings fetched while the quiz is open), and
 * the answers sent in the background. Only the last answer's reply is acted on.
 */
export function useQuizJourney({ lesson, visible, completionTime }: QuizJourneyOptions) {
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | undefined>(undefined);
  const [wrongAnswer, setWrongAnswer] = useState<string | undefined>(undefined);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [instant, setInstant] = useState<AnswerView | null>(null);
  const [visit, setVisit] = useState<VisitAnswers>(new Map());
  const submit = useSubmitQuiz(lesson.id);
  const refreshLesson = useRefreshLesson(lesson.id);
  const endings = useQuizOutcomes(lesson.id, visible).data;
  const quizzes = lesson.quizzes;
  const current = quizzes[currentQuizIndex];

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

  /**
   * Start again from the lesson, as the quiz opens: resume from its first unresolved question. The
   * finished result's own state starts clean on its own: `submit.reset()` unmounts it.
   */
  function restart() {
    resumeFrom(lesson);
    setVisit(new Map());
    submit.reset();
  }

  /** A multiple-choice answer is a toggle: pressing the picked one clears it. */
  function toggleOption(option: string) {
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
   * The last answer was refused. An already-answered question advances (to "Already Completed" when
   * none is left). Any other failure resumes from what the server has.
   */
  function handleLastError(error: unknown) {
    if (isLessonAlreadyCompleted(error)) advanceToNextUnresolved(current?.id);
    else void resumeFromServer();
  }

  function handleLastReply(reply: QuizResult) {
    if (!reply.lessonFinalized) void resumeFromServer();
  }

  function submitAnswer() {
    if (!current || !selectedAnswer) return;
    const input = {
      lessonId: lesson.id,
      answers: { [current.id]: selectedAnswer },
      ...(wrongAnswer !== undefined ? { isRetake: true } : {}),
      ...(completionTime ? { completionTime: completionTime() } : {}),
    };
    // The result shows now; the answer is sent in the background, and only the last one's reply is acted on.
    const view = answerViewOf({ quiz: current, quizzes, answer: selectedAnswer, retake: wrongAnswer !== undefined, resolvedIds, lesson, visit, endings });
    if (view.kind !== 'retry') setVisit(new Map(visit).set(current.id, view.answered));
    setInstant(view);
    submit.mutate(input, view.kind === 'final' ? { onSuccess: handleLastReply, onError: handleLastError } : undefined);
  }

  function tryAgain() {
    setWrongAnswer(selectedAnswer);
    setSelectedAnswer(undefined);
    setInstant(null);
    submit.reset();
  }

  return {
    currentQuizIndex, current, selectedAnswer, setSelectedAnswer, wrongAnswer, alreadyCompleted, instant, submit,
    restart, toggleOption, advanceToNextUnresolved, submitAnswer, tryAgain,
  };
}
