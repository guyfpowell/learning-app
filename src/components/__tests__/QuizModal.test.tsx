import React from 'react';
import { StyleSheet } from 'react-native';
import { must } from '@/test-utils/must';
import { GENERIC_ERROR } from '@/lib/errors';
import { colors, fontSize, radius, spacing } from '@/theme';
import { headerRowBox } from '@/components/quiz/QuizResultFrame';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react-native';
import { PINNED_ACTION_CLEARANCE } from '@/components/ui/PinnedAction';
import { QUESTION_RANGE } from '@/components/quiz/QuizHeroCard';
import { QuizModal } from '../QuizModal';
import { burstShift } from '@/components/quiz/ResultHeading';
import { useSubmitQuiz } from '@/hooks/useQuiz';
import { useSaveLesson, useUnsaveLesson } from '@/hooks/useLesson';
import { usePreloadLesson } from '@/hooks/usePreloadLesson';
import { useRouter } from 'expo-router';
import type { Lesson, QuizOutcome, QuizOutcomesResponse, QuizResult } from '@learning/shared';
import { quizOutcomeKeyOf } from '@learning/shared';
import { useRefreshPaths, useTopicFeedback } from '@/hooks/useTrack';
import { useQuizOutcomes } from '@/hooks/useQuizOutcomes';
import { useRefreshLesson } from '@/hooks/useRefreshLesson';
import { axiosError } from '@/test-utils/axios';
import {
  ERROR_CODES,
  metresChipCopy,
  accuracyArrowOf,
  accuracyTextOf,
  TRACK_ACCURACY_LABEL,
  CORRECT_PHRASES,
  INCORRECT_PHRASES,
  resetFeedbackPhrases,
} from '@learning/shared';
import { makeRewardUnlock, makeRewards } from '@/test-utils/achievements';
import { useCelebrationQueueStore } from '@/store/celebrationQueue.store';

jest.mock('@/hooks/useQuiz', () => ({ useSubmitQuiz: jest.fn() }));
jest.mock('@/hooks/useLesson', () => ({
  useSaveLesson: jest.fn(),
  useUnsaveLesson: jest.fn(),
}));
jest.mock('@/hooks/usePreloadLesson', () => ({ usePreloadLesson: jest.fn() }));
jest.mock('@/hooks/useTrack', () => ({
  useTopicFeedback: jest.fn(),
  useRefreshPaths: jest.fn(),
}));
jest.mock('@/hooks/useQuizOutcomes', () => ({ useQuizOutcomes: jest.fn() }));
jest.mock('@/hooks/useRefreshLesson', () => ({ useRefreshLesson: jest.fn() }));
jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
jest.mock('@/components/ui/LessonRatingControl', () => {
  const { Text } = require('react-native');
  return { LessonRatingControl: ({ lessonId, rating }: { lessonId: string; rating: string | null }) =>
    <Text testID="rating-stub">{`${lessonId}:${rating}`}</Text> };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({ top: 44, bottom: 34, left: 0, right: 0 })),
}));

const mockMutate = jest.fn();
const mockSaveMutate = jest.fn();
const mockUnsaveMutate = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockTopicSubmit = jest.fn();
const mockRefreshPaths = jest.fn();
const mockRefreshLesson = jest.fn();

const SUBMIT_FAILED_MESSAGE = 'Failed to submit answer';
/** The server refusing an answer to a lesson it already counts as finished. */
const alreadyCompletedError = () => axiosError('ERR_BAD_REQUEST', 409, { code: ERROR_CODES.LESSON_ALREADY_COMPLETED });
const submitFailedError = () => axiosError('ERR_BAD_RESPONSE', 500, { message: SUBMIT_FAILED_MESSAGE });

/** What the last `setQuizMock` was given, so `renderQuiz` can replay it once the answer has been given. */
let quizMockOverrides: Record<string, unknown> = {};

function setQuizMock(overrides: Record<string, unknown> = {}) {
  quizMockOverrides = overrides;
  (useSubmitQuiz as jest.Mock).mockReturnValue({
    mutate: mockMutate,
    reset: jest.fn(),
    isPending: false,
    isError: false,
    data: undefined,
    ...overrides,
  });
}

const mockQuiz1 = {
  id: 'q-1',
  lessonId: 'lesson-1',
  type: 'multiple-choice' as const,
  question: 'What is product-market fit?',
  options: ['Option A', 'Option B', 'Option C'],
  correctAnswer: 'Option A',
  explanation: 'Because it matches market needs.',
};

const mockQuiz2 = {
  id: 'q-2',
  lessonId: 'lesson-1',
  type: 'multiple-choice' as const,
  question: 'What does MVP stand for?',
  options: ['Maximum Viable Product', 'Minimum Viable Product', 'Most Valuable Product'],
  correctAnswer: 'Minimum Viable Product',
  explanation: 'MVP = Minimum Viable Product.',
};

const mockLesson = {
  id: 'lesson-1',
  skillPathId: 'sp-1',
  lessonNumber: 1,
  isTeaser: false,
  title: 'Introduction to PM',
  content: '{}',
  keyTakeaway: 'Fit beats features.',
  durationMinutes: 5,
  difficulty: 'beginner' as const,
  quizzes: [mockQuiz1, mockQuiz2],
  retakeOffered: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockLessonNoQuiz = { ...mockLesson, quizzes: [] };

const singleQuizLesson = { ...mockLesson, quizzes: [mockQuiz1] };

// Wrong first attempt — retakeAvailable, lesson not finalized
const wrongPendingResult = {
  correct: false,
  retakeAvailable: true,
  lessonFinalized: false,
  feedbacks: [
    { quizId: 'q-1', question: mockQuiz1.question, userAnswer: 'Option B', correctAnswer: null, isCorrect: false, explanation: 'x' },
  ],
  lesson: singleQuizLesson,
  streak: 0,
  milestone: null,
  nextLessonId: null,
  trackAccuracy: null,
  previousTrackAccuracy: null,
  topicEnd: null,
  rewards: null,
};

// Full finalized result
const mockResult = {
  correct: true,
  retakeAvailable: false,
  lessonFinalized: true,
  streak: 0,
  milestone: null,
  nextLessonId: null,
  trackAccuracy: 90,
  previousTrackAccuracy: 80,
  topicEnd: null,
  rewards: makeRewards(),
  feedbacks: [
    {
      quizId: 'q-1',
      question: 'What is product-market fit?',
      userAnswer: 'Option A',
      correctAnswer: 'Option A',
      isCorrect: true,
      explanation: 'Because it matches market needs.',
    },
    {
      quizId: 'q-2',
      question: 'What does MVP stand for?',
      userAnswer: 'Minimum Viable Product',
      correctAnswer: 'Minimum Viable Product',
      isCorrect: true,
      explanation: 'MVP = Minimum Viable Product.',
    },
  ],
  lesson: mockLesson,
};

// Per-question result for Q1 correct, lesson not yet finalized (mid-capstone)
const q1CorrectNotFinalized = {
  correct: true,
  retakeAvailable: false,
  lessonFinalized: false,
  streak: 0,
  milestone: null,
  nextLessonId: null,
  trackAccuracy: null,
  previousTrackAccuracy: null,
  rewards: null,
  feedbacks: [
    {
      quizId: 'q-1',
      question: mockQuiz1.question,
      userAnswer: 'Option A',
      correctAnswer: 'Option A',
      isCorrect: true,
      explanation: 'Because it matches market needs.',
    },
  ],
  lesson: mockLesson,
};

/** One way the quiz can end, as the endings route gives it. */
function makeEnding(overrides: Partial<QuizOutcome> = {}): QuizOutcome {
  return { trackAccuracy: 90, previousTrackAccuracy: 80, streak: 0, milestone: null, nextLessonId: null, topicEnd: null, rewards: makeRewards(), ...overrides };
}

/** Gives the quiz its endings, as `useQuizOutcomes` returns them once fetched. */
function setEndings(outcomes: QuizOutcomesResponse['outcomes'], resolved: QuizOutcomesResponse['resolved'] = []) {
  (useQuizOutcomes as jest.Mock).mockReturnValue({ data: { pass: 1, resolved, outcomes } });
}

const FIRST_TRY_KEY = quizOutcomeKeyOf(['firstTry']);

/** The option a question does not accept. */
function wrongOptionOf(quiz: Lesson['quizzes'][number]): string {
  return must(quiz.options?.find(o => o !== quiz.correctAnswer), 'wrong option');
}

/** Picks an answer and presses Submit. */
function submitAnswer(option: string) {
  fireEvent.press(screen.getByText(option));
  fireEvent.press(screen.getByText('Submit'));
}

/** Answers the question on screen wrongly twice, which resolves it. */
function answerWrongTwice(quiz: Lesson['quizzes'][number]) {
  submitAnswer(wrongOptionOf(quiz));
  fireEvent.press(screen.getByText('Try again'));
  resetFeedbackPhrases();
  submitAnswer(quiz.options?.filter(o => o !== quiz.correctAnswer)[1] ?? wrongOptionOf(quiz));
}

/**
 * Renders the quiz and, when the test has set a reply on the submit mock, gives the answers that lead to
 * a result of that kind first (the view now comes from the answer, not from the reply), then lets the
 * reply arrive. A test with no reply set renders plainly.
 */
function renderQuiz(ui: React.ReactElement<{ visible: boolean; lesson: Lesson }>) {
  const reply = quizMockOverrides.data as QuizResult | undefined;
  if (!reply || !ui.props.visible) return render(ui);
  const replied = quizMockOverrides;
  const { lesson } = ui.props;
  const resolved = lesson.resolvedQuizIds ?? [];
  const pending = lesson.quizzes.filter(q => !resolved.includes(q.id));
  // A finishing reply follows the last question's answer, with the earlier ones already resolved on the server.
  const answered = reply.lessonFinalized ? must(pending[pending.length - 1], 'last question') : must(pending[0], 'first question');
  const earlier = reply.lessonFinalized ? pending.filter(q => q.id !== answered.id).map(q => q.id) : [];
  const shown = React.cloneElement(ui, { lesson: { ...lesson, resolvedQuizIds: [...resolved, ...earlier] } });
  setQuizMock({ ...replied, data: undefined });
  const view = render(shown);
  if (!reply.correct && reply.retakeAvailable) submitAnswer(wrongOptionOf(answered));
  else if (!reply.correct) answerWrongTwice(answered);
  else submitAnswer(answered.correctAnswer);
  setQuizMock(replied);
  view.rerender(React.cloneElement(shown));
  return view;
}

describe('QuizModal', () => {
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    resetFeedbackPhrases();
    setQuizMock();
    (useSaveLesson as jest.Mock).mockReturnValue({ mutate: mockSaveMutate });
    (useUnsaveLesson as jest.Mock).mockReturnValue({ mutate: mockUnsaveMutate });
    (useRouter as jest.Mock).mockReturnValue({ replace: mockReplace, back: mockBack, canGoBack: () => true });
    (useTopicFeedback as jest.Mock).mockReturnValue({ submit: mockTopicSubmit });
    (useRefreshPaths as jest.Mock).mockReturnValue(mockRefreshPaths);
    mockTopicSubmit.mockResolvedValue(undefined);
    (useQuizOutcomes as jest.Mock).mockReturnValue({ data: undefined });
    (useRefreshLesson as jest.Mock).mockReturnValue(mockRefreshLesson);
    mockRefreshLesson.mockResolvedValue(undefined);
  });

  it('does not render content when visible=false', () => {
    renderQuiz(<QuizModal visible={false} lesson={mockLesson} onClose={onClose} />);
    expect(screen.queryByText('What is product-market fit?')).toBeNull();
  });

  it('renders the first question when visible', () => {
    renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.getByText('What is product-market fit?')).toBeTruthy();
  });

  it('shows question progress indicator for multi-question lessons', () => {
    renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.getByText('Question 1 of 2')).toBeTruthy();
  });

  it('does not show progress indicator for single-question lessons', () => {
    renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
    expect(screen.queryByText('Question 1 of 1')).toBeNull();
  });

  it('shows a progress percentage and ProgressBar for multi-question lessons', () => {
    renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.getByText('50%')).toBeTruthy();
    expect(screen.getByTestId('quiz-progress-bar')).toBeTruthy();
  });

  it('does not show a ProgressBar for single-question lessons', () => {
    renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
    expect(screen.queryByTestId('quiz-progress-bar')).toBeNull();
  });

  it('096: the question is large text with no bar and no box', () => {
    renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
    const card = screen.getByTestId('quiz-hero-card');
    expect(within(card).getByText('What is product-market fit?')).toBeTruthy();
    const style = StyleSheet.flatten(card.props.style) ?? {};
    expect([style.borderLeftWidth, style.borderLeftColor, style.paddingLeft, style.backgroundColor, style.shadowOpacity])
      .toEqual([undefined, undefined, undefined, undefined, undefined]);
    expect(StyleSheet.flatten(within(card).getByText('What is product-market fit?').props.style).color).toBe(colors.textStrong);
  });

  it('096: a single question has no "Question" label; the header says "Test my knowledge"', () => {
    renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
    expect(screen.queryByText(/^question$/i)).toBeNull();
    const title = StyleSheet.flatten(screen.getByText('Test my knowledge').props.style);
    expect(title).toMatchObject({ color: colors.textMuted, fontSize: fontSize.sm });
  });

  it('096: the question is fitted like the key takeaway, hidden until its size settles', () => {
    renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
    const text = screen.getByText('What is product-market fit?');
        expect(StyleSheet.flatten(text.props.style)).toMatchObject({ fontSize: QUESTION_RANGE.max, opacity: 0 });
  });

  it('091c: a capstone\'s "Question N of M", percentage and bar are inside the hero card', () => {
    renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    const card = screen.getByTestId('quiz-hero-card');
    expect(within(card).getByText('Question 1 of 2')).toBeTruthy();
    expect(within(card).getByText('50%')).toBeTruthy();
    expect(within(card).getByTestId('quiz-progress-bar')).toBeTruthy();
  });

  it('091c: a short-answer question sits in the hero card above the input', () => {
    const shortAnswer = { ...mockQuiz1, type: 'short-answer' as const, options: [] };
    renderQuiz(<QuizModal visible={true} lesson={{ ...singleQuizLesson, quizzes: [shortAnswer] }} onClose={onClose} />);
    expect(within(screen.getByTestId('quiz-hero-card')).getByText('What is product-market fit?')).toBeTruthy();
    expect(screen.getByPlaceholderText('Your answer...')).toBeTruthy();
  });

  it('Submit is hidden until an answer is picked, then pinned and cobalt', () => {
    renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
    expect(screen.queryByTestId('submit-btn')).toBeNull();
    fireEvent.press(screen.getByText('Option A'));
    expect(within(screen.getByTestId('pinned-action')).getByText('Submit')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('submit-btn').props.style).backgroundColor).toBe(colors.brand);
  });

  it('picking an answer hides the others, and picking it again brings them back and hides Submit', () => {
    renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
    fireEvent.press(screen.getByTestId('quiz-opt-0'));
    expect(screen.getByTestId('quiz-opt-0')).toBeTruthy();
    expect(screen.queryByTestId('quiz-opt-1')).toBeNull();
    expect(screen.queryByTestId('quiz-opt-2')).toBeNull();
    expect(screen.getByTestId('submit-btn')).toBeTruthy();
    fireEvent.press(screen.getByTestId('quiz-opt-0'));
    expect(screen.getByTestId('quiz-opt-0').props.accessibilityState).toMatchObject({ selected: false });
    expect(screen.getByTestId('quiz-opt-1')).toBeTruthy();
    expect(screen.getByTestId('quiz-opt-2')).toBeTruthy();
    expect(screen.queryByTestId('submit-btn')).toBeNull();
  });

  it('091c: a picked option is announced as selected', () => {
    renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
    expect(screen.getByTestId('quiz-opt-0').props.accessibilityState).toMatchObject({ selected: false });
    fireEvent.press(screen.getByTestId('quiz-opt-0'));
    expect(screen.getByTestId('quiz-opt-0').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.queryByTestId('quiz-opt-1')).toBeNull();
  });

  it('renders multiple-choice options', () => {
    renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.getByText('Option A')).toBeTruthy();
    expect(screen.getByText('Option B')).toBeTruthy();
    expect(screen.getByText('Option C')).toBeTruthy();
  });

  it('shows Submit for each question once an answer is picked', () => {
    renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    fireEvent.press(screen.getByText('Option A'));
    expect(screen.getByText('Submit')).toBeTruthy();
  });

  it('calls mutate with only the current question answer on Submit', () => {
    renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
    fireEvent.press(screen.getByText('Option A'));
    fireEvent.press(screen.getByText('Submit'));
    expect(mockMutate).toHaveBeenCalledWith(
      { lessonId: 'lesson-1', answers: { 'q-1': 'Option A' } },
      expect.anything()
    );
  });

  it('shows results view after successful submission when finalized', () => {
    setQuizMock({ data: mockResult });
    renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.getByText(CORRECT_PHRASES[0])).toBeTruthy();
    expect(screen.getByText(accuracyTextOf(90))).toBeTruthy();
  });

  it('terminal view shows "Incorrect" heading when submit.data.correct is false', () => {
    setQuizMock({ data: { ...mockResult, correct: false, retakeAvailable: false } });
    renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
    expect(screen.getByText(INCORRECT_PHRASES[0])).toBeTruthy();
    expect(screen.queryByText(CORRECT_PHRASES[0])).toBeNull();
  });

  it('shows the track accuracy and its label in results', () => {
    setQuizMock({ data: mockResult });
    renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.getByText(accuracyTextOf(mockResult.trackAccuracy))).toBeTruthy();
    expect(screen.getByText(TRACK_ACCURACY_LABEL)).toBeTruthy();
  });

  it('reads the accuracy from its visible text, with no label of its own', () => {
    setQuizMock({ data: { ...mockResult, trackAccuracy: null, previousTrackAccuracy: null } });
    renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    const badge = screen.getByTestId('track-accuracy');
    expect(within(badge).getByText(accuracyTextOf(null))).toBeTruthy();
    expect(within(badge).getByText(TRACK_ACCURACY_LABEL)).toBeTruthy();
    expect([badge.props.accessible, badge.props.accessibilityLabel]).toEqual([true, undefined]);
  });

  it.each([
    ['up', 90, 80],
    ['down', 70, 80],
    ['equal', 70, 70],
  ])('shows the %s arrow accuracyArrowOf gives', (_name, now, before) => {
    setQuizMock({ data: { ...mockResult, trackAccuracy: now, previousTrackAccuracy: before } });
    renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.getByText(must(accuracyArrowOf(now, before), 'arrow'))).toBeTruthy();
  });

  it('shows no arrow when there is no previous accuracy (first lesson in track)', () => {
    setQuizMock({ data: { ...mockResult, trackAccuracy: 100, previousTrackAccuracy: null } });
    renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    for (const [now, before] of [[2, 1], [1, 2], [1, 1]]) {
      expect(screen.queryByText(must(accuracyArrowOf(now, before), 'arrow'))).toBeNull();
    }
  });

  it('shows feedback items in results', () => {
    setQuizMock({ data: mockResult });
    renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.getByText('Because it matches market needs.')).toBeTruthy();
  });

  it('shows fallback error message when submission fails with no API message', () => {
    setQuizMock({ isError: true, error: null });
    renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.getByTestId('submit-error')).toBeTruthy();
    expect(screen.getByText(GENERIC_ERROR)).toBeTruthy();
  });

  it('shows API error message when submission fails with API-provided message', () => {
    setQuizMock({
      isError: true,
      error: submitFailedError(),
    });
    renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.getByText(SUBMIT_FAILED_MESSAGE)).toBeTruthy();
  });

  it('shows "no quiz" message when lesson has no quizzes', () => {
    renderQuiz(<QuizModal visible={true} lesson={mockLessonNoQuiz} onClose={onClose} />);
    expect(screen.getByText('No quiz available for this lesson.')).toBeTruthy();
  });

  it('calls onClose when close button is pressed', () => {
    renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    fireEvent.press(screen.getByLabelText('Close quiz'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows "Back to Dashboard" button in terminal view when nextLessonId is null', () => {
    setQuizMock({ data: { ...mockResult, nextLessonId: null } });
    renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.getByText('Back to dashboard')).toBeTruthy();
    expect(screen.queryByText('DONE')).toBeNull();
  });

  it('"Back to Dashboard" in terminal view calls onClose and navigates to lessons', () => {
    setQuizMock({ data: { ...mockResult, nextLessonId: null } });
    renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    fireEvent.press(screen.getByText('Back to dashboard'));
    expect(onClose).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/lessons');
  });

  it('shows "Next Lesson" button in terminal view when nextLessonId is present', () => {
    setQuizMock({ data: { ...mockResult, nextLessonId: 'lesson-2' } });
    renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.getByText('Next lesson')).toBeTruthy();
    expect(screen.queryByText('DONE')).toBeNull();
  });

  it('offers Home as a small word beside Next lesson, and goes Home when pressed', () => {
    setQuizMock({ data: { ...mockResult, nextLessonId: 'lesson-2' } });
    renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(within(screen.getByTestId('result-action-btn')).getByText('Next lesson')).toBeTruthy();
    fireEvent.press(screen.getByTestId('result-home-btn'));
    expect(onClose).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/lessons');
  });

  it('has no Home beside "Back to dashboard", which already goes Home', () => {
    setQuizMock({ data: { ...mockResult, nextLessonId: null } });
    renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.queryByTestId('result-home-btn')).toBeNull();
  });

  it('the result action is a pinned white button on the colour, with the page scrolling behind it', () => {
    setQuizMock({ data: { ...mockResult, nextLessonId: 'lesson-2' } });
    renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(within(screen.getByTestId('pinned-action')).getByTestId('result-action-btn')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('result-action-btn').props.style).backgroundColor).toBe(colors.white);
  });

  it('the retry offer\'s button is ink on the sand', () => {
    setQuizMock({ data: { ...mockResult, correct: false, retakeAvailable: true, lessonFinalized: false } });
    renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(StyleSheet.flatten(screen.getByTestId('result-action-btn').props.style).backgroundColor).toBe(colors.surfaceInverse);
  });

  it.each([
    ['the retry offer', { ...mockResult, correct: false, retakeAvailable: true, lessonFinalized: false }, 'Try again'],
    ['a capstone question\'s feedback', { ...mockResult, lessonFinalized: false }, 'Next question'],
  ])('096: %s pins its one button at the foot too', (_label, data, label) => {
    setQuizMock({ data });
    renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(within(screen.getByTestId('pinned-action')).getByText(new RegExp(label, 'i'))).toBeTruthy();
  });

  it('"Next Lesson" in terminal view calls onClose and navigates to that lesson', () => {
    setQuizMock({ data: { ...mockResult, nextLessonId: 'lesson-2' } });
    renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    fireEvent.press(screen.getByText('Next lesson'));
    expect(onClose).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/lesson/lesson-2');
  });

  it('the close button in the terminal view leaves the lesson, back to where it was opened from', () => {
    setQuizMock({ data: { ...mockResult, nextLessonId: 'lesson-2' } });
    renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    fireEvent.press(screen.getByLabelText('Close quiz results'));
    expect(mockBack).toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('renders an animated milestone card when milestone is set on finalize', () => {
    setQuizMock({ data: { ...mockResult, milestone: '7-day streak', streak: 7 } });
    renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.getByTestId('milestone-card')).toBeTruthy();
    expect(screen.getByText('🎉 7-day streak!')).toBeTruthy();
  });

  it('does not render the milestone card when milestone is null', () => {
    setQuizMock({ data: { ...mockResult, milestone: null } });
    renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.queryByTestId('milestone-card')).toBeNull();
  });

  it('renders no coaching card, whatever the result holds', () => {
    const coachingText = 'Great work! You answered correctly.';
    setQuizMock({ data: mockResult });
    renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.queryByText('AI Coaching')).toBeNull();
    expect(screen.queryByText(coachingText)).toBeNull();
  });

  describe('per-question capstone flow (ticket 019 ch2.1)', () => {
    it('shows per-question feedback "Correct!" when Q1 correct and lessonFinalized is false', () => {
      setQuizMock({ data: q1CorrectNotFinalized });
      renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.getByText(CORRECT_PHRASES[0])).toBeTruthy();
    });

    it('does not show terminal elements in per-question feedback view', () => {
      setQuizMock({ data: q1CorrectNotFinalized });
      renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.queryByText('Quiz Complete!')).toBeNull();
      expect(screen.queryByText(TRACK_ACCURACY_LABEL)).toBeNull();
      expect(screen.queryByText('DONE')).toBeNull();
    });

    it('shows "Next Question" button in per-question feedback view', () => {
      setQuizMock({ data: q1CorrectNotFinalized });
      renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.getByText('Next question')).toBeTruthy();
    });

    it('Next Question button advances to Q2 after Q1 per-question feedback', () => {
      const resetMock = jest.fn();
      setQuizMock({ data: q1CorrectNotFinalized, reset: resetMock });
      const { rerender } = renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);

      fireEvent.press(screen.getByText('Next question'));

      // After advancing, reset is called and submit.data clears — show Q2 quiz view
      setQuizMock({ reset: resetMock });
      rerender(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.getByText('What does MVP stand for?')).toBeTruthy();
      expect(screen.getByText('Question 2 of 2')).toBeTruthy();
    });

    it('shows per-question "Incorrect" feedback when Q1 wrong and no retake (resolved with skip)', () => {
      const q1WrongResolved = {
        ...q1CorrectNotFinalized,
        correct: false,
        retakeAvailable: false,
        feedbacks: [
          { quizId: 'q-1', question: mockQuiz1.question, userAnswer: 'Option B', correctAnswer: 'Option A', isCorrect: false, explanation: 'x' },
        ],
      };
      setQuizMock({ data: q1WrongResolved });
      renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.getByText(INCORRECT_PHRASES[0])).toBeTruthy();
      expect(screen.getByText('Next question')).toBeTruthy();
      expect(screen.queryByText('Quiz Complete!')).toBeNull();
    });

    it('last question finalized → full terminal view', () => {
      setQuizMock({ data: { ...mockResult, lessonFinalized: true } });
      renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.getByText(CORRECT_PHRASES[0])).toBeTruthy();
      expect(screen.getByText(TRACK_ACCURACY_LABEL)).toBeTruthy();
      expect(screen.queryByText('Next question')).toBeNull();
    });

    it('079f: finalized result shows the thumbs with the stored verdict from the result lesson', () => {
      setQuizMock({ data: { ...mockResult, lesson: { ...mockLesson, rating: 'up' } } });
      renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.getByTestId('rating-stub').props.children).toBe('lesson-1:up');
      expect(within(screen.getByTestId('quiz-frame-header')).getByTestId('rating-stub')).toBeTruthy();
      expect(within(screen.getByTestId('quiz-frame-content')).queryByTestId('rating-stub')).toBeNull();
    });

    it('096: the result and question bodies leave room under their last line for the pinned button', () => {
      const { useSafeAreaInsets } = require('react-native-safe-area-context');
      (useSafeAreaInsets as jest.Mock).mockReturnValue({ top: 44, bottom: 34, left: 0, right: 0 });
      setQuizMock({ data: mockResult });
      const { unmount } = renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      // The result body leaves room under its last line for the pinned Next lesson (096).
      expect(StyleSheet.flatten(screen.getByTestId('quiz-frame-content').props.contentContainerStyle).paddingBottom).toBe(PINNED_ACTION_CLEARANCE + 34);
      unmount();
      setQuizMock({ data: undefined });
      renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      // The question body leaves room under its last answer for the pinned Submit, and a little more.
      expect(StyleSheet.flatten(screen.getByTestId('quiz-question-content').props.contentContainerStyle).paddingBottom).toBeGreaterThan(PINNED_ACTION_CLEARANCE + 34);
    });

    it('079f: no thumbs while the lesson is not finalized', () => {
      setQuizMock({ data: wrongPendingResult });
      renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      expect(screen.queryByTestId('rating-stub')).toBeNull();
    });

    it('resume: starts on Q2 when resolvedQuizIds contains Q1 id', () => {
      const lessonWithResolved = { ...mockLesson, resolvedQuizIds: ['q-1'] };
      renderQuiz(<QuizModal visible={true} lesson={lessonWithResolved} onClose={onClose} />);
      expect(screen.getByText('What does MVP stand for?')).toBeTruthy();
      expect(screen.getByText('Question 2 of 2')).toBeTruthy();
    });

    it('submits only Q1 answer when Submit is pressed on Q1', () => {
      renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      fireEvent.press(screen.getByText('Option A'));
      fireEvent.press(screen.getByText('Submit'));
      expect(mockMutate).toHaveBeenCalledWith({ lessonId: 'lesson-1', answers: { 'q-1': 'Option A' } }, undefined);
    });
  });

  describe('retake (079e)', () => {
    it('sends completionTime with every submission', () => {
      renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} completionTime={() => 73} />);
      fireEvent.press(screen.getByText('Option A'));
      fireEvent.press(screen.getByText('Submit'));
      expect(mockMutate).toHaveBeenCalledWith(
        { lessonId: 'lesson-1', answers: { 'q-1': 'Option A' }, completionTime: 73 },
        expect.anything()
      );
    });

    it('accepts answers on a completed lesson while a retake is in progress', () => {
      const completedLesson = { ...singleQuizLesson, quizCompleted: true, lessonRetakeInProgress: true, resolvedQuizIds: [] };
      renderQuiz(<QuizModal visible={true} lesson={completedLesson} onClose={onClose} />);
      expect(screen.queryByText('Already Completed')).toBeNull();
      fireEvent.press(screen.getByText('Option A'));
      fireEvent.press(screen.getByText('Submit'));
      expect(mockMutate).toHaveBeenCalled();
    });
  });

  describe('already-completed handling (bug fix — 409 LESSON_003 with no unresolved question left)', () => {
    it('shows "Already Completed" on open when lesson.quizCompleted is true, instead of a live question', () => {
      const completedLesson = { ...singleQuizLesson, quizCompleted: true };
      renderQuiz(<QuizModal visible={true} lesson={completedLesson} onClose={onClose} />);
      expect(screen.getByText('Already Completed')).toBeTruthy();
      expect(screen.queryByText('What is product-market fit?')).toBeNull();
    });

    it('079f: "Already Completed" shows the thumbs with the stored verdict', () => {
      const completedLesson = { ...singleQuizLesson, quizCompleted: true, rating: 'down' as const };
      renderQuiz(<QuizModal visible={true} lesson={completedLesson} onClose={onClose} />);
      expect(screen.getByTestId('rating-stub').props.children).toBe('lesson-1:down');
      expect(within(screen.getByTestId('quiz-frame-header')).getByTestId('rating-stub')).toBeTruthy();
    });

    it('shows "Already Completed" on open when every quiz id is already in resolvedQuizIds', () => {
      const allResolvedLesson = { ...singleQuizLesson, resolvedQuizIds: ['q-1'] };
      renderQuiz(<QuizModal visible={true} lesson={allResolvedLesson} onClose={onClose} />);
      expect(screen.getByText('Already Completed')).toBeTruthy();
    });

    it('does not show "Already Completed" for a lesson with no quizzes (keeps "no quiz" message)', () => {
      const completedNoQuiz = { ...mockLessonNoQuiz, quizCompleted: true };
      renderQuiz(<QuizModal visible={true} lesson={completedNoQuiz} onClose={onClose} />);
      expect(screen.getByText('No quiz available for this lesson.')).toBeTruthy();
      expect(screen.queryByText('Already Completed')).toBeNull();
    });

    it('409 LESSON_003 on the last/only unresolved question → shows "Already Completed" instead of silently resetting', () => {
      const resetMock = jest.fn();
      (useSubmitQuiz as jest.Mock).mockReturnValue({
        mutate: jest.fn((_, { onError }) =>
          onError(alreadyCompletedError())
        ),
        reset: resetMock,
        isPending: false,
        isError: false,
        data: undefined,
      });

      const { rerender } = renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      fireEvent.press(screen.getByText('Option A'));
      fireEvent.press(screen.getByText('Submit'));

      setQuizMock({ reset: resetMock });
      rerender(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      expect(screen.getByText('Already Completed')).toBeTruthy();
      expect(screen.queryByText('What is product-market fit?')).toBeNull();
    });

    it('"Back to Dashboard" on "Already Completed" calls onClose and navigates to lessons when no nextLessonId', () => {
      const completedLesson = { ...singleQuizLesson, quizCompleted: true };
      renderQuiz(<QuizModal visible={true} lesson={completedLesson} onClose={onClose} />);
      expect(screen.getByText('Back to dashboard')).toBeTruthy();
      fireEvent.press(screen.getByText('Back to dashboard'));
      expect(onClose).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)/lessons');
    });

    it('"Next Lesson" on "Already Completed" navigates to next lesson when nextLessonId present', () => {
      const completedLesson = { ...singleQuizLesson, quizCompleted: true, nextLessonId: 'lesson-99' };
      renderQuiz(<QuizModal visible={true} lesson={completedLesson} onClose={onClose} />);
      expect(screen.getByText('Next lesson')).toBeTruthy();
      fireEvent.press(screen.getByText('Next lesson'));
      expect(onClose).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/lesson/lesson-99');
    });

    it('a fresh finalized result in the same session still shows the real terminal view, not "Already Completed"', () => {
      setQuizMock({ data: { ...mockResult, lessonFinalized: true } });
      renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.getByText(CORRECT_PHRASES[0])).toBeTruthy();
      expect(screen.queryByText('Already Completed')).toBeNull();
    });
  });

  describe('quiz retake (ticket 017 goal 4)', () => {
    it('shows an Incorrect screen with keyTakeaway and Try again when a first attempt is wrong', () => {
      setQuizMock({ data: wrongPendingResult });
      renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);

      expect(screen.getByText(INCORRECT_PHRASES[0])).toBeTruthy();
      expect(screen.getByText('Fit beats features.')).toBeTruthy();
      expect(screen.getByText('Try again')).toBeTruthy();
      // "Next lesson" button removed (item 7) — try again is the only action
      expect(screen.queryByText('Next lesson')).toBeNull();
      expect(screen.queryByText('Quiz Complete!')).toBeNull();
    });

    it('has no close button on the retry screen: the way on is Try again', () => {
      setQuizMock({ data: wrongPendingResult });
      renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      expect(screen.queryByLabelText('Close quiz results')).toBeNull();
    });

    it('shows ONE MORE TRY, the nudge and the hint, and never the answer', () => {
      setQuizMock({ data: wrongPendingResult });
      renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      expect(within(screen.getByTestId('verdict-mark')).getByText('ONE MORE TRY')).toBeTruthy();
      expect(screen.getByText("Have another go. Here's a nudge.")).toBeTruthy();
      expect(within(screen.getByTestId('hint-section')).getByText('HINT')).toBeTruthy();
      expect(screen.queryByText('THE ANSWER')).toBeNull();
    });

    it('Try again calls reset on the mutation', () => {
      const reset = jest.fn();
      setQuizMock({ data: wrongPendingResult, reset });
      renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);

      fireEvent.press(screen.getByText('Try again'));
      expect(reset).toHaveBeenCalled();
    });

    it('resubmits with isRetake: true after Try again and reselecting', () => {
      setQuizMock({ data: undefined });
      const { rerender } = renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      fireEvent.press(screen.getByText('Option B'));
      fireEvent.press(screen.getByText('Submit'));
      expect(mockMutate).toHaveBeenCalledWith({ lessonId: 'lesson-1', answers: { 'q-1': 'Option B' } }, undefined);

      setQuizMock({ data: wrongPendingResult });
      rerender(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      fireEvent.press(screen.getByText('Try again'));

      setQuizMock({ data: undefined });
      rerender(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      fireEvent.press(screen.getByText('Option A'));
      fireEvent.press(screen.getByText('Submit'));

      expect(mockMutate).toHaveBeenLastCalledWith(
        { lessonId: 'lesson-1', answers: { 'q-1': 'Option A' }, isRetake: true },
        expect.anything()
      );
    });

    it('on the second try, notes it, and rules the wrong first pick out: struck through and not pressable', () => {
      setQuizMock({ data: undefined });
      const { rerender } = renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      expect(screen.queryByTestId('second-try-note')).toBeNull();
      fireEvent.press(screen.getByText('Option B'));
      fireEvent.press(screen.getByText('Submit'));

      setQuizMock({ data: wrongPendingResult });
      rerender(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      fireEvent.press(screen.getByText('Try again'));

      setQuizMock({ data: undefined });
      rerender(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      expect(within(screen.getByTestId('second-try-note')).getByText('Retry')).toBeTruthy();
      expect(StyleSheet.flatten(screen.getByText('Option B').props.style).textDecorationLine).toBe('line-through');
      expect(screen.getByTestId('quiz-opt-1').props.accessibilityState).toMatchObject({ disabled: true });
      // ...and it drops to the bottom of the list.
      const order = screen.getAllByTestId(/^quiz-opt-\d$/).map(node => node.props.testID);
      expect(order).toEqual(['quiz-opt-0', 'quiz-opt-2', 'quiz-opt-1']);
    });

    it('shows the full results view (not the retake offer) once retakeAvailable is false', () => {
      setQuizMock({ data: { ...mockResult, correct: false, retakeAvailable: false } });
      renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);

      expect(screen.getByText(INCORRECT_PHRASES[0])).toBeTruthy();
      expect(screen.queryByText('Try again')).toBeNull();
    });

    it('shows the down arrow after a wrong answer that lowered accuracy, even on the second try', () => {
      setQuizMock({ data: { ...mockResult, correct: false, retakeAvailable: false, trackAccuracy: 70, previousTrackAccuracy: 80 } });
      renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);

      expect(screen.getByText(must(accuracyArrowOf(70, 80), 'arrow'))).toBeTruthy();
      expect(screen.queryByText(must(accuracyArrowOf(80, 70), 'arrow'))).toBeNull();
      expect(screen.queryByText(must(accuracyArrowOf(70, 70), 'arrow'))).toBeNull();
    });
  });

  describe('Chunk 3 — Quiz complete: key takeaway card + correct-answer highlight', () => {
    const resultWithIncorrectFeedback = {
      ...mockResult,
      feedbacks: [
        {
          quizId: 'q-1',
          question: 'What is product-market fit?',
          userAnswer: 'Option B',
          correctAnswer: 'Option A',
          isCorrect: false,
          explanation: 'Because it matches market needs.',
        },
      ],
    };

    it('shows no key takeaway in a correct or incorrect terminal view', () => {
      setQuizMock({ data: mockResult });
      renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.queryByText('KEY TAKEAWAY')).toBeNull();
      expect(screen.queryByText('Fit beats features.')).toBeNull();
    });

    it('shows correct answer text prominently for incorrect feedback in terminal view', () => {
      setQuizMock({ data: resultWithIncorrectFeedback });
      renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      expect(screen.getByText('THE ANSWER')).toBeTruthy();
      expect(screen.getByText('Option A')).toBeTruthy();
    });

    it('does not show the key takeaway in per-question feedback view (mid-capstone)', () => {
      setQuizMock({ data: q1CorrectNotFinalized });
      renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.queryByText('Fit beats features.')).toBeNull();
    });
  });

  describe('bookmark (ticket 017 chunk 3)', () => {
    it('is not shown while the quiz question is active (before submitting)', () => {
      renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.queryByLabelText('Save lesson')).toBeNull();
      expect(screen.queryByLabelText('Remove from saved lessons')).toBeNull();
    });

    it('reflects lesson.isSaved=false in the results view', () => {
      setQuizMock({ data: mockResult });
      renderQuiz(<QuizModal visible={true} lesson={{ ...mockLesson, isSaved: false }} onClose={onClose} />);
      expect(screen.getByLabelText('Save lesson')).toBeTruthy();
    });

    it('reflects lesson.isSaved=true in the results view', () => {
      setQuizMock({ data: mockResult });
      renderQuiz(<QuizModal visible={true} lesson={{ ...mockLesson, isSaved: true }} onClose={onClose} />);
      expect(screen.getByLabelText('Remove from saved lessons')).toBeTruthy();
    });

    it('is shown on the wrong-first-attempt (retake offer) screen too', () => {
      setQuizMock({ data: wrongPendingResult });
      renderQuiz(<QuizModal visible={true} lesson={{ ...singleQuizLesson, isSaved: false }} onClose={onClose} />);
      expect(screen.getByLabelText('Save lesson')).toBeTruthy();
    });

    it('calls useSaveLesson.mutate with the lesson id when toggled on', () => {
      setQuizMock({ data: mockResult });
      renderQuiz(<QuizModal visible={true} lesson={{ ...mockLesson, isSaved: false }} onClose={onClose} />);
      fireEvent.press(screen.getByLabelText('Save lesson'));
      expect(mockSaveMutate).toHaveBeenCalledWith({ lessonId: 'lesson-1' }, expect.anything());
      expect(useSaveLesson).toHaveBeenCalledWith('lesson-1');
      expect(useSubmitQuiz).toHaveBeenCalledWith('lesson-1');
    });

    it('calls useUnsaveLesson.mutate with the lesson id when toggled off', () => {
      setQuizMock({ data: mockResult });
      renderQuiz(<QuizModal visible={true} lesson={{ ...mockLesson, isSaved: true }} onClose={onClose} />);
      fireEvent.press(screen.getByLabelText('Remove from saved lessons'));
      expect(mockUnsaveMutate).toHaveBeenCalledWith({ lessonId: 'lesson-1' }, expect.anything());
    });

    it('is shown on the per-question feedback view', () => {
      setQuizMock({ data: q1CorrectNotFinalized });
      renderQuiz(<QuizModal visible={true} lesson={{ ...mockLesson, isSaved: false }} onClose={onClose} />);
      expect(screen.getByLabelText('Save lesson')).toBeTruthy();
    });
  });

  // ─── Chunk A4 — QuizFeedbackCard, block order, QuizOpt, safe-area insets ─────

  describe('Chunk A4 — QuizFeedbackCard block order', () => {
    const incorrectFeedback = {
      quizId: 'q-1',
      question: 'What is product-market fit?',
      userAnswer: 'Option B',
      correctAnswer: 'Option A',
      isCorrect: false,
      explanation: 'Because it matches market needs.',
    };
    const correctFeedback = {
      quizId: 'q-1',
      question: 'What is product-market fit?',
      userAnswer: 'Option A',
      correctAnswer: 'Option A',
      isCorrect: true,
      explanation: 'Because it matches market needs.',
    };

    it('correct: shows your answer, then Why with the explanation', () => {
      setQuizMock({ data: { ...mockResult, feedbacks: [correctFeedback] } });
      const { toJSON } = renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      expect(screen.getByText('YOUR ANSWER')).toBeTruthy();
      expect(screen.getByText('Option A')).toBeTruthy();
      expect(screen.queryByText('THE ANSWER')).toBeNull();
      expect(screen.queryByText('What is product-market fit?')).toBeNull();

      const tree = JSON.stringify(toJSON());
      expect(tree.indexOf('Option A')).toBeGreaterThan(-1);
      expect(tree.indexOf('WHY')).toBeGreaterThan(tree.indexOf('Option A'));
      expect(tree.indexOf('Because it matches market needs')).toBeGreaterThan(tree.indexOf('WHY'));
    });

    it('incorrect: shows your answer struck through, the answer, then Why', () => {
      setQuizMock({ data: { ...mockResult, correct: false, retakeAvailable: false, feedbacks: [incorrectFeedback] } });
      const { toJSON } = renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      expect(screen.getByText('YOUR ANSWER')).toBeTruthy();
      expect(screen.getByText('THE ANSWER')).toBeTruthy();
      expect(StyleSheet.flatten(screen.getByText('Option B').props.style).textDecorationLine).toBe('line-through');

      const tree = JSON.stringify(toJSON());
      expect(tree.indexOf('THE ANSWER')).toBeGreaterThan(tree.indexOf('YOUR ANSWER'));
      expect(tree.indexOf('WHY')).toBeGreaterThan(tree.indexOf('THE ANSWER'));
      expect(tree.indexOf('Because it matches market needs')).toBeGreaterThan(tree.indexOf('WHY'));
    });

    it('mid-capstone feedback uses QuizFeedbackCard (Why heading present)', () => {
      setQuizMock({ data: q1CorrectNotFinalized });
      renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.getAllByText('WHY').length).toBeGreaterThan(0);
    });
  });

  describe('Chunk A4 — QuizOpt options', () => {
    it('renders each multiple-choice option as a QuizOpt tile', () => {
      renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      expect(screen.getByTestId('quiz-opt-0')).toBeTruthy();
      expect(screen.getByTestId('quiz-opt-1')).toBeTruthy();
      expect(screen.getByTestId('quiz-opt-2')).toBeTruthy();
    });

    it('renders option text alongside the letter key', () => {
      renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      expect(screen.getByText('Option A')).toBeTruthy();
      expect(screen.getByText('Option B')).toBeTruthy();
    });

    it('previously wrong option gets testID quiz-opt-0 and is visually disabled', () => {
      // Start with no data, press an option to select it
      renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      // All options are initially present
      expect(screen.getByTestId('quiz-opt-0')).toBeTruthy();
      expect(screen.getByTestId('quiz-opt-1')).toBeTruthy();
    });
  });

  describe('burstShift', () => {
    it('centres a heading scaled from its left edge', () => {
      expect(burstShift(350, 200, 1)).toBe(75);
      expect(burstShift(350, 200, 1.7)).toBe(5);
    });

    it('puts a tiny heading at the centre of the box', () => {
      expect(burstShift(350, 200, 0)).toBe(175);
    });
  });

  describe('096 — heading animation', () => {
    const headingStyle = () => StyleSheet.flatten(screen.getByTestId('result-heading').props.style);

    it('scales a correct heading in from behind the screen and slides it from the centre back to the left', () => {
      setEndings({ [FIRST_TRY_KEY]: makeEnding() });
      setQuizMock({ data: { ...mockResult, correct: true } });
      renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      expect(headingStyle().transform).toHaveLength(2);
    });

    it('leaves an incorrect heading still', () => {
      setQuizMock({ data: { ...mockResult, correct: false, retakeAvailable: false } });
      renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      expect(headingStyle().transform).toBeUndefined();
    });
  });

  describe('verdict screens', () => {
    it.each([
      ['a correct result', { ...mockResult, correct: true }],
      ['an incorrect result', { ...mockResult, correct: false, retakeAvailable: false }],
    ])('%s has no verdict mark, the background says it', (_label, data) => {
      setQuizMock({ data });
      renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.queryByTestId('verdict-mark')).toBeNull();
      expect(screen.queryByText('CORRECT')).toBeNull();
      expect(screen.queryByText('INCORRECT')).toBeNull();
    });

    it('an incorrect result\'s button is white on the ink', () => {
      setQuizMock({ data: { ...mockResult, correct: false, retakeAvailable: false } });
      renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(StyleSheet.flatten(screen.getByTestId('result-action-btn').props.style).backgroundColor).toBe(colors.white);
    });
  });

  describe('096 — result screen layout', () => {
    it('has no streak calendar in the header, whatever the streak', () => {
      setQuizMock({ data: { ...mockResult, streak: 4 } });
      renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.queryByTestId('streak-calendar')).toBeNull();
      expect(screen.queryByText('4-day streak')).toBeNull();
    });

    it('puts the thumbs in their own bubble in the header', () => {
      setQuizMock({ data: { ...mockResult } });
      renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      const bubble = within(screen.getByTestId('header-rating-bubble'));
      expect(bubble.getByTestId('rating-stub')).toBeTruthy();
      expect(bubble.queryByLabelText('Close quiz results')).toBeNull();
    });

    it('draws the close button and the bookmark as matching rounded squares over the colour', () => {
      setQuizMock({ data: { ...mockResult } });
      renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      const bookmark = StyleSheet.flatten(screen.getByLabelText('Save lesson').props.style);
      const close = StyleSheet.flatten(screen.getByLabelText('Close quiz results').props.style);
      expect(close.width).toBe(close.height);
      expect(close.borderRadius).toBeLessThan(radius.pill);
      expect(bookmark).toMatchObject({ width: close.width, height: close.height, borderRadius: close.borderRadius });
    });

    it('anchors the metres animation on the header row', () => {
      setQuizMock({ data: { ...mockResult, streak: 4, rewards: makeRewards({ metresClimbed: 20 }) } });
      renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      const { top, height } = headerRowBox(44); // the mocked top inset
      expect(StyleSheet.flatten(screen.getByTestId('metres-chip-overlay').props.style)).toMatchObject({ top, height });
    });

    it('puts the metres chip and the track accuracy under the heading', () => {
      setQuizMock({ data: { ...mockResult, rewards: makeRewards({ metresClimbed: 20 }) } });
      renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      const headline = within(screen.getByTestId('result-headline'));
      expect(headline.getByText(TRACK_ACCURACY_LABEL)).toBeTruthy();
      expect(headline.getByText(CORRECT_PHRASES[0])).toBeTruthy();
      expect(headline.getByTestId('metres-chip')).toBeTruthy();
    });

    it('keeps the heading in the headline row when there is no metres chip', () => {
      setQuizMock({ data: { ...mockResult, rewards: null } });
      renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(within(screen.getByTestId('result-headline')).getByText(CORRECT_PHRASES[0])).toBeTruthy();
    });

    it('has no streak on the result page: not in the header and not beside the heading', () => {
      setQuizMock({ data: { ...mockResult, streak: 4, rewards: makeRewards({ metresClimbed: 20 }) } });
      renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.queryByTestId('streak-calendar')).toBeNull();
      expect(within(screen.getByTestId('result-headline')).queryByText(/streak/i)).toBeNull();
    });

    it('brings the feedback, the takeaway and the button in block by block, after the heading', () => {
      setQuizMock({ data: { ...mockResult, rewards: makeRewards({ metresClimbed: 20 }) } });
      renderQuiz(<QuizModal visible={true} lesson={{ ...mockLesson, keyTakeaway: 'Match effort to the tier.' }} onClose={onClose} />);
      const reveals = screen.getAllByTestId('reveal');
      expect(reveals.length).toBeGreaterThanOrEqual(3); // the feedback card, the takeaway, the button
      expect(within(screen.getByTestId('result-headline')).queryByTestId('reveal')).toBeNull();
    });
  });

  describe('Ticket 118ae — metres chip', () => {
    it('reads "+34m · Level 4" for a pass paying 34 with a level-up to 4', () => {
      setQuizMock({ data: { ...mockResult, rewards: makeRewards({ metresClimbed: 34, levelUp: { from: 3, to: 4 } }) } });
      renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(within(screen.getByTestId('metres-chip')).getByText(metresChipCopy(34, 4))).toBeTruthy();
    });

    it('reads "+34m" for a pass paying 34 with no level-up', () => {
      setQuizMock({ data: { ...mockResult, rewards: makeRewards({ metresClimbed: 34 }) } });
      renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(within(screen.getByTestId('metres-chip')).getByText(metresChipCopy(34, null))).toBeTruthy();
    });

    it('shows no chip and no line for a failed pass (0 metres)', () => {
      setQuizMock({ data: { ...mockResult, rewards: makeRewards({ metresClimbed: 0 }) } });
      renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.queryByTestId('metres-chip')).toBeNull();
      expect(screen.queryByTestId('metres-chip-animated')).toBeNull();
      expect(screen.queryByText(/\+\d+m/)).toBeNull();
    });

    it('shows no chip when the result carries no rewards', () => {
      setQuizMock({ data: { ...mockResult, rewards: null } });
      renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.queryByTestId('metres-chip')).toBeNull();
    });
  });

  describe('Ticket 120af — rewards go to the celebration queue', () => {
    const medal = makeRewardUnlock('first-light');
    const landmark = makeRewardUnlock('yr-wyddfa');
    const queued = () => useCelebrationQueueStore.getState().queue;
    beforeEach(() => useCelebrationQueueStore.getState().clear());

    it('enqueues the medal first, then the landmark, once each, and shows no unlock screen itself', () => {
      setQuizMock({ data: { ...mockResult, rewards: makeRewards({ unlocked: [medal], landmarksPassed: [landmark], metresClimbed: 34 }) } });
      const { rerender } = renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      rerender(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(queued()).toEqual([medal, landmark]);
      expect(screen.queryByTestId('achievement-unlock')).toBeNull();
      expect(screen.queryByTestId('achievements-skip-btn')).toBeNull();
    });

    it('keeps the way on available while unlocks wait: no "See achievement" step', () => {
      setQuizMock({ data: { ...mockResult, rewards: makeRewards({ unlocked: [medal] }) } });
      renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(within(screen.getByTestId('result-action-btn')).getByText(/Next lesson|Back to dashboard/)).toBeTruthy();
    });

    it('holds the metres chip until the queue is empty, then shows it', () => {
      setQuizMock({ data: { ...mockResult, rewards: makeRewards({ unlocked: [medal], landmarksPassed: [landmark], metresClimbed: 34 }) } });
      renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.queryByTestId('metres-chip')).toBeNull();
      expect(screen.queryByTestId('metres-chip-animated')).toBeNull();
      act(() => useCelebrationQueueStore.getState().dismiss(medal.key));
      expect(screen.queryByTestId('metres-chip')).toBeNull();
      act(() => useCelebrationQueueStore.getState().dismiss(landmark.key));
      expect(within(screen.getByTestId('metres-chip')).getByText(metresChipCopy(34, null))).toBeTruthy();
      expect(screen.getByTestId('metres-chip-animated')).toBeTruthy();
    });

    it('shows the chip at once when nothing was unlocked', () => {
      setQuizMock({ data: { ...mockResult, rewards: makeRewards({ metresClimbed: 75 }) } });
      renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.getByTestId('metres-chip-animated')).toBeTruthy();
    });

    it('shows no overlay when the result carries no metres and no unlocks', () => {
      setQuizMock({ data: { ...mockResult, rewards: makeRewards() } });
      renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.queryByTestId('metres-chip-animated')).toBeNull();
      expect(queued()).toEqual([]);
    });
  });

  describe('Chunk A4 — safe-area insets on header', () => {
    it('header paddingTop is derived from useSafeAreaInsets top inset, not a hardcoded constant', () => {
      const { useSafeAreaInsets } = require('react-native-safe-area-context');
      (useSafeAreaInsets as jest.Mock).mockReturnValue({ top: 59, bottom: 34, left: 0, right: 0 });
      renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      // The quiz is rendered with the inset applied — presence of the question proves
      // the component rendered without crashing when insets.top is non-zero
      expect(screen.getByText('What is product-market fit?')).toBeTruthy();
    });

    it('header paddingTop is derived from insets in terminal results view too', () => {
      const { useSafeAreaInsets } = require('react-native-safe-area-context');
      (useSafeAreaInsets as jest.Mock).mockReturnValue({ top: 47, bottom: 34, left: 0, right: 0 });
      setQuizMock({ data: mockResult });
      renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.getByText(CORRECT_PHRASES[0])).toBeTruthy();
    });
  });
  describe('end-of-topic feedback (079d)', () => {
    const topicEnd = { planId: 'plan-1', stableKey: 'topic-a', title: 'Pricing basics' };

    afterEach(() => jest.useRealTimers());

    it('shows the screen in the terminal view when the result carries a topicEnd', () => {
      setQuizMock({ data: { ...mockResult, topicEnd } });
      renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.getByTestId('topic-feedback')).toBeTruthy();
      expect(screen.getByText('Pricing basics')).toBeTruthy();
    });

    it('shows nothing when topicEnd is null', () => {
      setQuizMock({ data: { ...mockResult, topicEnd: null } });
      renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.queryByTestId('topic-feedback')).toBeNull();
    });

    it('an answer writes to the plan, then the acknowledgement closes itself, hides the screen and refetches paths', async () => {
      jest.useFakeTimers();
      setQuizMock({ data: { ...mockResult, topicEnd } });
      renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      fireEvent.press(screen.getByTestId('topic-feedback-useful-useful'));
      // The press awaits the write; inside act, everything it sets lands before the asserts.
      await act(async () => fireEvent.press(screen.getByTestId('topic-feedback-submit')));
      expect(mockTopicSubmit).toHaveBeenCalledWith('plan-1', { stableKey: 'topic-a', dismissed: false, useful: 'useful' });
      expect(mockRefreshPaths).not.toHaveBeenCalled();
      act(() => { jest.runOnlyPendingTimers(); });
      expect(mockRefreshPaths).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('topic-feedback')).toBeNull();
    });

    it('Skip writes a dismissal', async () => {
      setQuizMock({ data: { ...mockResult, topicEnd } });
      renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      await act(async () => fireEvent.press(screen.getByTestId('topic-feedback-skip')));
      expect(mockTopicSubmit).toHaveBeenCalledWith('plan-1', { stableKey: 'topic-a', dismissed: true });
      expect(screen.queryByTestId('topic-feedback')).toBeNull();
      expect(mockRefreshPaths).toHaveBeenCalledTimes(1);
    });
  });
  describe('115a: preload the next lesson', () => {
    it('asks for the next lesson once a submit finalises the lesson', () => {
      setQuizMock({ data: { ...mockResult, nextLessonId: 'L3' } });
      renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(usePreloadLesson).toHaveBeenLastCalledWith('L3');
    });

    it('asks for nothing after a partial (not finalised) submit', () => {
      setQuizMock({ data: { ...q1CorrectNotFinalized, nextLessonId: 'L3' } });
      renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(usePreloadLesson).not.toHaveBeenCalledWith('L3');
    });

    it('asks for the next lesson when the already-completed view shows', () => {
      renderQuiz(<QuizModal visible={true} lesson={{ ...singleQuizLesson, quizCompleted: true, nextLessonId: 'L4' }} onClose={onClose} />);
      expect(usePreloadLesson).toHaveBeenLastCalledWith('L4');
    });

    it('asks for nothing on the already-completed view with no next lesson', () => {
      renderQuiz(<QuizModal visible={true} lesson={{ ...singleQuizLesson, quizCompleted: true, nextLessonId: null }} onClose={onClose} />);
      expect(usePreloadLesson).not.toHaveBeenCalledWith('L4');
      expect(usePreloadLesson).toHaveBeenLastCalledWith(null);
    });

    it('asks for nothing while the modal is closed', () => {
      renderQuiz(<QuizModal visible={false} lesson={{ ...singleQuizLesson, quizCompleted: true, nextLessonId: 'L4' }} onClose={onClose} />);
      expect(usePreloadLesson).not.toHaveBeenCalledWith('L4');
    });
  });

  // ─── 115e, 137d: every learner sees each answer's result before the server replies ───
  describe('115e instant answer (every learner)', () => {
    const capstone = { ...mockLesson, quizzes: [mockQuiz1, mockQuiz2] };

    beforeEach(() => {
    });

    function answer(option: string) {
      fireEvent.press(screen.getByText(option));
      fireEvent.press(screen.getByText('Submit'));
    }

    /** The options passed to the nth `mutate` call: the callbacks of the answer that was sent. */
    function optionsOfCall(n: number): { onError?: (error: unknown) => void; onSuccess?: (data: unknown) => void } | undefined {
      return must(mockMutate.mock.calls[n], 'mutate call')[1];
    }

    it('correct, one question: the heading shows while pending, the button loads, and the reply fills the rest', () => {
      const view = renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      answer('Option A');
      expect(screen.getByTestId('result-heading')).toBeTruthy();
      const button = screen.getByTestId('result-action-btn');
      expect(button.props.accessibilityState.disabled).toBe(true);
      expect(screen.queryByTestId('result-home-btn')).toBeNull();
      expect(screen.queryByText(accuracyTextOf(90))).toBeNull();
      setQuizMock({ data: { ...mockResult, feedbacks: [mockResult.feedbacks[0]], nextLessonId: 'lesson-9' } });
      view.rerender(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      expect(screen.getByText(accuracyTextOf(90))).toBeTruthy();
      expect(screen.getByTestId('result-home-btn')).toBeTruthy();
      fireEvent.press(within(screen.getByTestId('result-action-btn')).getByText('Next lesson'));
      expect(mockReplace).toHaveBeenCalledWith('/lesson/lesson-9');
    });

    it('the heading keeps its phrase and does not burst again when the reply arrives', () => {
      const headingStyle = () => StyleSheet.flatten(screen.getByTestId('result-heading').props.style);
      const view = renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      answer('Option A');
      expect(headingStyle().transform).toHaveLength(2);
      setQuizMock({ data: { ...mockResult, feedbacks: [mockResult.feedbacks[0]] } });
      view.rerender(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      expect(screen.getByText(accuracyTextOf(90))).toBeTruthy();
      expect(screen.getByText(CORRECT_PHRASES[0])).toBeTruthy();
      expect(headingStyle().transform).toBeUndefined();
    });

    it('wrong first attempt: Try again with the key takeaway at once, no correct answer, then the retry is sent as a retake', () => {
      renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      answer('Option B');
      expect(screen.getByText('Try again')).toBeTruthy();
      expect(screen.getByText('Fit beats features.')).toBeTruthy();
      expect(screen.queryByText('Option A')).toBeNull();
      fireEvent.press(screen.getByText('Try again'));
      answer('Option C');
      expect(mockMutate).toHaveBeenLastCalledWith(
        expect.objectContaining({ answers: { 'q-1': 'Option C' }, isRetake: true }),
        expect.anything(),
      );
    });

    it('capstone: Q1 right shows its feedback at once, and Q2 can be answered before Q1 is answered by the server', () => {
      renderQuiz(<QuizModal visible={true} lesson={capstone} onClose={onClose} />);
      answer('Option A');
      expect(screen.getByText('Next question')).toBeTruthy();
      fireEvent.press(screen.getByText('Next question'));
      answer('Minimum Viable Product');
      expect(mockMutate.mock.calls.map(c => must(c[0], 'input').answers)).toEqual([
        { 'q-1': 'Option A' },
        { 'q-2': 'Minimum Viable Product' },
      ]);
      expect(screen.getByTestId('result-heading')).toBeTruthy();
    });

    it('capstone: Q1 wrong on the second attempt shows its feedback at once, with the correct answer', () => {
      renderQuiz(<QuizModal visible={true} lesson={capstone} onClose={onClose} />);
      answer('Option B');
      fireEvent.press(screen.getByText('Try again'));
      answer('Option C');
      expect(screen.getByText('Next question')).toBeTruthy();
      expect(screen.getByText('Option A')).toBeTruthy();
    });

    it('a question already resolved on the server counts toward the last one', () => {
      renderQuiz(<QuizModal visible={true} lesson={{ ...capstone, resolvedQuizIds: ['q-1'] }} onClose={onClose} />);
      answer('Minimum Viable Product');
      expect(screen.getByTestId('result-heading')).toBeTruthy();
      expect(screen.queryByText('Next question')).toBeNull();
    });

    it('last reply fails: the lesson is refetched, the quiz resumes at the first unresolved question, and the error shows', async () => {
      const resumed = { ...capstone, resolvedQuizIds: [] };
      mockRefreshLesson.mockResolvedValue(resumed);
      renderQuiz(<QuizModal visible={true} lesson={{ ...capstone, resolvedQuizIds: ['q-1'] }} onClose={onClose} />);
      answer('Minimum Viable Product');
      setQuizMock({ isError: true, error: submitFailedError() });
      await act(async () => { must(optionsOfCall(0)?.onError, 'onError')(new Error('x')); });
      expect(mockRefreshLesson).toHaveBeenCalled();
      expect(screen.getByText('What is product-market fit?')).toBeTruthy();
      expect(screen.getByTestId('submit-error')).toBeTruthy();
      expect(screen.getByText(SUBMIT_FAILED_MESSAGE)).toBeTruthy();
    });

    it('last reply not finalised: the lesson is refetched and the quiz resumes at the first unresolved question', async () => {
      mockRefreshLesson.mockResolvedValue({ ...capstone, resolvedQuizIds: ['q-1'] });
      renderQuiz(<QuizModal visible={true} lesson={capstone} onClose={onClose} />);
      answer('Option A');
      fireEvent.press(screen.getByText('Next question'));
      answer('Minimum Viable Product');
      await act(async () => { must(optionsOfCall(1)?.onSuccess, 'onSuccess')(q1CorrectNotFinalized); });
      expect(mockRefreshLesson).toHaveBeenCalled();
      expect(screen.getByText('What does MVP stand for?')).toBeTruthy();
      expect(screen.queryByTestId('result-heading')).toBeNull();
    });

    it('last reply LESSON_ALREADY_COMPLETED: the already-completed view shows', async () => {
      renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      answer('Option A');
      await act(async () => { must(optionsOfCall(0)?.onError, 'onError')(alreadyCompletedError()); });
      expect(screen.getByText('Already Completed')).toBeTruthy();
      expect(mockRefreshLesson).not.toHaveBeenCalled();
    });

    it('an answer before the last is sent with no reply handlers, so its failure changes nothing', () => {
      renderQuiz(<QuizModal visible={true} lesson={capstone} onClose={onClose} />);
      answer('Option A');
      expect(optionsOfCall(0)).toBeUndefined();
    });

    it('never shows the question as submitting', () => {
      setQuizMock({ isPending: true });
      renderQuiz(<QuizModal visible={true} lesson={capstone} onClose={onClose} />);
      fireEvent.press(screen.getByText('Option A'));
      expect(screen.getByText('Submit')).toBeTruthy();
    });
  });

  // ─── 137d: the whole result page shows at once, from the ending that matches the answers ───
  describe('137d instant result', () => {
    const topicEnd = { planId: 'plan-1', stableKey: 'topic-a', title: 'Pricing basics' };
    const medal = makeRewardUnlock('first-light');
    const landmark = makeRewardUnlock('yr-wyddfa');
    const queued = () => useCelebrationQueueStore.getState().queue;
    beforeEach(() => useCelebrationQueueStore.getState().clear());

    function answer(option: string) {
      fireEvent.press(screen.getByText(option));
      fireEvent.press(screen.getByText('Submit'));
    }

    /** The reply to the one question's answer, finishing the lesson. */
    function reply(overrides: Partial<QuizResult> = {}): QuizResult {
      return { ...mockResult, feedbacks: [must(mockResult.feedbacks[0], 'feedback')], ...overrides };
    }

    it('asks for the endings of the lesson while the quiz is open', () => {
      renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      expect(useQuizOutcomes).toHaveBeenLastCalledWith('lesson-1', true);
    });

    it('shows the ending\'s figures, the next lesson and an active button before the reply', () => {
      setEndings({ [FIRST_TRY_KEY]: makeEnding({ trackAccuracy: 91, nextLessonId: 'lesson-9', rewards: makeRewards({ metresClimbed: 34 }) }) });
      renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      answer('Option A');
      expect(screen.getByText(accuracyTextOf(91))).toBeTruthy();
      expect(within(screen.getByTestId('metres-chip')).getByText(metresChipCopy(34, null))).toBeTruthy();
      expect(screen.getByTestId('result-action-btn').props.accessibilityState.disabled).not.toBe(true);
      fireEvent.press(within(screen.getByTestId('result-action-btn')).getByText('Next lesson'));
      expect(mockReplace).toHaveBeenCalledWith('/lesson/lesson-9');
    });

    it('shows the ending\'s milestone and topic end before the reply', () => {
      setEndings({ [FIRST_TRY_KEY]: makeEnding({ milestone: '7-day streak', streak: 7, topicEnd }) });
      renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      answer('Option A');
      expect(screen.getByText('🎉 7-day streak!')).toBeTruthy();
      expect(screen.getByTestId('topic-feedback')).toBeTruthy();
    });

    it('a free learner sees the answer\'s result before the reply', () => {
      renderQuiz(<QuizModal visible={true} lesson={{ ...mockLesson, resolvedQuizIds: ['q-1'] }} onClose={onClose} />);
      answer('Minimum Viable Product');
      expect(screen.getByTestId('result-heading')).toBeTruthy();
    });

    it('a reply with a different figure updates the page in place, without remounting it', async () => {
      setEndings({ [FIRST_TRY_KEY]: makeEnding({ trackAccuracy: 91, topicEnd }) });
      const view = renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      answer('Option A');
      expect(screen.getByText(accuracyTextOf(91))).toBeTruthy();
      await act(async () => fireEvent.press(screen.getByTestId('topic-feedback-skip')));
      expect(screen.queryByTestId('topic-feedback')).toBeNull();
      setQuizMock({ data: reply({ trackAccuracy: 95, topicEnd }) });
      view.rerender(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      expect(screen.getByText(accuracyTextOf(95))).toBeTruthy();
      expect(screen.queryByText(accuracyTextOf(91))).toBeNull();
      // Closed by the learner before the reply: a remount would bring it back.
      expect(screen.queryByTestId('topic-feedback')).toBeNull();
    });

    it('keeps the heading\'s phrase and does not burst again when the reply arrives', () => {
      const headingStyle = () => StyleSheet.flatten(screen.getByTestId('result-heading').props.style);
      setEndings({ [FIRST_TRY_KEY]: makeEnding() });
      const view = renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      answer('Option A');
      expect(headingStyle().transform).toHaveLength(2);
      setQuizMock({ data: reply({ trackAccuracy: 95 }) });
      view.rerender(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      expect(screen.getByText(accuracyTextOf(95))).toBeTruthy();
      expect(screen.getByText(CORRECT_PHRASES[0])).toBeTruthy();
      expect(headingStyle().transform).toHaveLength(2);
    });

    it('an unlock in both the ending and the reply is celebrated once', () => {
      setEndings({ [FIRST_TRY_KEY]: makeEnding({ rewards: makeRewards({ unlocked: [medal], metresClimbed: 34 }) }) });
      const view = renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      answer('Option A');
      expect(queued()).toEqual([medal]);
      act(() => useCelebrationQueueStore.getState().dismiss(medal.key));
      setQuizMock({ data: reply({ rewards: makeRewards({ unlocked: [medal], metresClimbed: 34 }) }) });
      view.rerender(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      expect(queued()).toEqual([]);
    });

    it('an unlock only in the reply is celebrated once', () => {
      setEndings({ [FIRST_TRY_KEY]: makeEnding({ rewards: makeRewards({ unlocked: [medal] }) }) });
      const view = renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      answer('Option A');
      setQuizMock({ data: reply({ rewards: makeRewards({ unlocked: [medal], landmarksPassed: [landmark] }) }) });
      view.rerender(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      expect(queued()).toEqual([medal, landmark]);
    });

    it('waits for the reply when no endings are loaded', () => {
      const view = renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      answer('Option A');
      expect(screen.getByTestId('result-heading')).toBeTruthy();
      expect(screen.queryByText(accuracyTextOf(90))).toBeNull();
      expect(screen.getByTestId('result-action-btn').props.accessibilityState.disabled).toBe(true);
      setQuizMock({ data: reply() });
      view.rerender(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      expect(screen.getByText(accuracyTextOf(90))).toBeTruthy();
    });

    it('waits for the reply when the endings hold none for these answers', () => {
      setEndings({ [quizOutcomeKeyOf(['wrong'])]: makeEnding() });
      renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      answer('Option A');
      expect(screen.queryByText(accuracyTextOf(90))).toBeNull();
      expect(screen.getByTestId('result-action-btn').props.accessibilityState.disabled).toBe(true);
    });

    it('a failed last reply resumes the quiz from the server', async () => {
      setEndings({ [FIRST_TRY_KEY]: makeEnding() });
      mockRefreshLesson.mockResolvedValue({ ...singleQuizLesson, resolvedQuizIds: [] });
      renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      answer('Option A');
      const onError = must(must(mockMutate.mock.calls[0], 'mutate call')[1], 'options').onError;
      await act(async () => { onError(submitFailedError()); });
      expect(mockRefreshLesson).toHaveBeenCalled();
      expect(screen.getByText('What is product-market fit?')).toBeTruthy();
    });

    it('a resumed two-question quiz picks its ending with question 1\'s outcome from the endings\' resolved list', () => {
      const q1Feedback = must(mockResult.feedbacks[0], 'feedback');
      setEndings(
        {
          [quizOutcomeKeyOf(['retry', 'firstTry'])]: makeEnding({ trackAccuracy: 77 }),
          [quizOutcomeKeyOf(['firstTry', 'firstTry'])]: makeEnding({ trackAccuracy: 99 }),
        },
        [{ feedback: q1Feedback, outcome: 'retry' }],
      );
      renderQuiz(<QuizModal visible={true} lesson={{ ...mockLesson, resolvedQuizIds: ['q-1'] }} onClose={onClose} />);
      answer('Minimum Viable Product');
      expect(screen.getByText(accuracyTextOf(77))).toBeTruthy();
      // The feedbacks are in quiz order: question 1's from the list, then this answer's.
      expect(screen.getByText(q1Feedback.question)).toBeTruthy();
      expect(screen.getByText(mockQuiz2.question)).toBeTruthy();
    });

    it('a capstone answered in this visit picks its ending from both answers\' outcomes', () => {
      setEndings({
        [quizOutcomeKeyOf(['firstTry', 'wrong'])]: makeEnding({ trackAccuracy: 61 }),
        [quizOutcomeKeyOf(['firstTry', 'firstTry'])]: makeEnding({ trackAccuracy: 99 }),
      });
      renderQuiz(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      answer('Option A');
      fireEvent.press(screen.getByText('Next question'));
      answer('Maximum Viable Product');
      fireEvent.press(screen.getByText('Try again'));
      answer('Most Valuable Product');
      expect(screen.getByText(accuracyTextOf(61))).toBeTruthy();
    });

    it('preloads the shown result\'s next lesson: the ending\'s first, then the reply\'s', () => {
      setEndings({ [FIRST_TRY_KEY]: makeEnding({ nextLessonId: 'L2' }) });
      const view = renderQuiz(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      expect(usePreloadLesson).toHaveBeenLastCalledWith(null);
      answer('Option A');
      expect(usePreloadLesson).toHaveBeenLastCalledWith('L2');
      setQuizMock({ data: reply({ nextLessonId: 'L3' }) });
      view.rerender(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      expect(usePreloadLesson).toHaveBeenLastCalledWith('L3');
    });
  });
});
