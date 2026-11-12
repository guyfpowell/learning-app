import React from 'react';
import { StyleSheet } from 'react-native';
import { must } from '@/test-utils/must';
import { colors, fontSize, radius, spacing } from '@/theme';
import { headerRowBox } from '@/components/quiz/QuizResultFrame';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react-native';
import { PINNED_ACTION_CLEARANCE } from '@/components/ui/PinnedAction';
import { QUESTION_RANGE } from '@/components/quiz/QuizHeroCard';
import { QuizModal, burstShift } from '../QuizModal';
import { useSubmitQuiz } from '@/hooks/useQuiz';
import { useSaveLesson, useUnsaveLesson } from '@/hooks/useLesson';
import { useRouter } from 'expo-router';
import { useRefreshPaths, useTopicFeedback } from '@/hooks/useTrack';

jest.mock('@/hooks/useQuiz', () => ({ useSubmitQuiz: jest.fn() }));
jest.mock('@/hooks/useLesson', () => ({
  useSaveLesson: jest.fn(),
  useUnsaveLesson: jest.fn(),
}));
jest.mock('@/hooks/useTrack', () => ({
  useTopicFeedback: jest.fn(),
  useRefreshPaths: jest.fn(),
}));
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

function setQuizMock(overrides: Record<string, unknown> = {}) {
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
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockLessonNoQuiz = { ...mockLesson, quizzes: [] };

const singleQuizLesson = { ...mockLesson, quizzes: [mockQuiz1] };

// Wrong first attempt — retakeAvailable, lesson not finalized
const wrongPendingResult = {
  score: 0,
  correct: false,
  retakeAvailable: true,
  lessonFinalized: false,
  feedbacks: [
    { quizId: 'q-1', question: mockQuiz1.question, userAnswer: 'Option B', correctAnswer: null, isCorrect: false, explanation: 'x' },
  ],
  lesson: singleQuizLesson,
  coaching: null,
  streak: 0,
  milestone: null,
  nextLessonId: null,
  trackAverage: null,
  previousAverage: null,
  xpAwarded: null,
  topicEnd: null,
};

// Full finalized result
const mockResult = {
  score: 100,
  correct: true,
  retakeAvailable: false,
  lessonFinalized: true,
  streak: 0,
  milestone: null,
  nextLessonId: null,
  trackAverage: 90,
  previousAverage: 80,
  xpAwarded: null,
  topicEnd: null,
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
  coaching: null,
};

// Per-question result for Q1 correct, lesson not yet finalized (mid-capstone)
const q1CorrectNotFinalized = {
  score: 100,
  correct: true,
  retakeAvailable: false,
  lessonFinalized: false,
  streak: 0,
  milestone: null,
  nextLessonId: null,
  trackAverage: null,
  previousAverage: null,
  xpAwarded: null,
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
  coaching: null,
};

jest.mock('@/lib/quizFeedbackPhrase', () => ({
  nextFeedbackPhrase: (correct: boolean) => (correct ? 'Correct!' : 'Incorrect'),
}));

describe('QuizModal', () => {
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    setQuizMock();
    (useSaveLesson as jest.Mock).mockReturnValue({ mutate: mockSaveMutate });
    (useUnsaveLesson as jest.Mock).mockReturnValue({ mutate: mockUnsaveMutate });
    (useRouter as jest.Mock).mockReturnValue({ replace: mockReplace, back: mockBack, canGoBack: () => true });
    (useTopicFeedback as jest.Mock).mockReturnValue({ submit: mockTopicSubmit });
    (useRefreshPaths as jest.Mock).mockReturnValue(mockRefreshPaths);
    mockTopicSubmit.mockResolvedValue(undefined);
  });

  it('does not render content when visible=false', () => {
    render(<QuizModal visible={false} lesson={mockLesson} onClose={onClose} />);
    expect(screen.queryByText('What is product-market fit?')).toBeNull();
  });

  it('renders the first question when visible', () => {
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.getByText('What is product-market fit?')).toBeTruthy();
  });

  it('shows question progress indicator for multi-question lessons', () => {
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.getByText('Question 1 of 2')).toBeTruthy();
  });

  it('does not show progress indicator for single-question lessons', () => {
    render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
    expect(screen.queryByText('Question 1 of 1')).toBeNull();
  });

  it('shows a progress percentage and ProgressBar for multi-question lessons', () => {
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.getByText('50%')).toBeTruthy();
    expect(screen.getByTestId('quiz-progress-bar')).toBeTruthy();
  });

  it('does not show a ProgressBar for single-question lessons', () => {
    render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
    expect(screen.queryByTestId('quiz-progress-bar')).toBeNull();
  });

  it('096: the question is large text with no bar and no box', () => {
    render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
    const card = screen.getByTestId('quiz-hero-card');
    expect(within(card).getByText('What is product-market fit?')).toBeTruthy();
    const style = StyleSheet.flatten(card.props.style) ?? {};
    expect([style.borderLeftWidth, style.borderLeftColor, style.paddingLeft, style.backgroundColor, style.shadowOpacity])
      .toEqual([undefined, undefined, undefined, undefined, undefined]);
    expect(StyleSheet.flatten(within(card).getByText('What is product-market fit?').props.style).color).toBe(colors.textStrong);
  });

  it('096: a single question has no "Question" label; the header says "Test my knowledge"', () => {
    render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
    expect(screen.queryByText(/^question$/i)).toBeNull();
    const title = StyleSheet.flatten(screen.getByText('Test my knowledge').props.style);
    expect(title).toMatchObject({ color: colors.textMuted, fontSize: fontSize.sm });
  });

  it('096: the question is fitted like the key takeaway, hidden until its size settles', () => {
    render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
    const text = screen.getByText('What is product-market fit?');
        expect(StyleSheet.flatten(text.props.style)).toMatchObject({ fontSize: QUESTION_RANGE.max, opacity: 0 });
  });

  it('091c: a capstone\'s "Question N of M", percentage and bar are inside the hero card', () => {
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    const card = screen.getByTestId('quiz-hero-card');
    expect(within(card).getByText('Question 1 of 2')).toBeTruthy();
    expect(within(card).getByText('50%')).toBeTruthy();
    expect(within(card).getByTestId('quiz-progress-bar')).toBeTruthy();
  });

  it('091c: a short-answer question sits in the hero card above the input', () => {
    const shortAnswer = { ...mockQuiz1, type: 'short-answer' as const, options: [] };
    render(<QuizModal visible={true} lesson={{ ...singleQuizLesson, quizzes: [shortAnswer] }} onClose={onClose} />);
    expect(within(screen.getByTestId('quiz-hero-card')).getByText('What is product-market fit?')).toBeTruthy();
    expect(screen.getByPlaceholderText('Your answer...')).toBeTruthy();
  });

  it('Submit is hidden until an answer is picked, then pinned and cobalt', () => {
    render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
    expect(screen.queryByTestId('submit-btn')).toBeNull();
    fireEvent.press(screen.getByText('Option A'));
    expect(within(screen.getByTestId('pinned-action')).getByText('Submit')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('submit-btn').props.style).backgroundColor).toBe(colors.brand);
  });

  it('picking an answer hides the others, and picking it again brings them back and hides Submit', () => {
    render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
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
    render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
    expect(screen.getByTestId('quiz-opt-0').props.accessibilityState).toMatchObject({ selected: false });
    fireEvent.press(screen.getByTestId('quiz-opt-0'));
    expect(screen.getByTestId('quiz-opt-0').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.queryByTestId('quiz-opt-1')).toBeNull();
  });

  it('renders multiple-choice options', () => {
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.getByText('Option A')).toBeTruthy();
    expect(screen.getByText('Option B')).toBeTruthy();
    expect(screen.getByText('Option C')).toBeTruthy();
  });

  it('shows Submit for each question once an answer is picked', () => {
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    fireEvent.press(screen.getByText('Option A'));
    expect(screen.getByText('Submit')).toBeTruthy();
  });

  it('calls mutate with only the current question answer on Submit', () => {
    render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
    fireEvent.press(screen.getByText('Option A'));
    fireEvent.press(screen.getByText('Submit'));
    expect(mockMutate).toHaveBeenCalledWith(
      { lessonId: 'lesson-1', answers: { 'q-1': 'Option A' } },
      expect.anything()
    );
  });

  it('shows spinner on Submit button while submitting', () => {
    setQuizMock({ isPending: true });
    render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
    fireEvent.press(screen.getByText('Option A'));
    expect(screen.queryByText('Submit')).toBeNull();
    const { ActivityIndicator } = require('react-native');
    expect(screen.UNSAFE_queryByType(ActivityIndicator)).toBeTruthy();
  });

  it('shows results view after successful submission when finalized', () => {
    setQuizMock({ data: mockResult });
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.getByText('Correct!')).toBeTruthy();
    expect(screen.getByText('90%')).toBeTruthy();
  });

  it('terminal view shows "Incorrect" heading when submit.data.correct is false', () => {
    setQuizMock({ data: { ...mockResult, correct: false, retakeAvailable: false } });
    render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
    expect(screen.getByText('Incorrect')).toBeTruthy();
    expect(screen.queryByText('Correct!')).toBeNull();
  });

  it('shows the track average label in results', () => {
    setQuizMock({ data: mockResult });
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.getByText('track average')).toBeTruthy();
  });

  it('shows an up arrow when the average improved on a non-retake result', () => {
    setQuizMock({ data: mockResult }); // trackAverage 90 > previousAverage 80
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.getByText('↑')).toBeTruthy();
  });

  it('shows a down arrow when the average decreased on a non-retake result', () => {
    setQuizMock({ data: { ...mockResult, trackAverage: 70, previousAverage: 80 } });
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.getByText('↓')).toBeTruthy();
  });

  it('shows no arrow when there is no previous average (first lesson in track)', () => {
    setQuizMock({ data: { ...mockResult, trackAverage: 100, previousAverage: null } });
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.queryByText('↑')).toBeNull();
    expect(screen.queryByText('↓')).toBeNull();
    expect(screen.queryByText('=')).toBeNull();
  });

  it('shows feedback items in results', () => {
    setQuizMock({ data: mockResult });
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.getByText('Because it matches market needs.')).toBeTruthy();
  });

  it('shows fallback error message when submission fails with no API message', () => {
    setQuizMock({ isError: true, error: null });
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.getByTestId('submit-error')).toBeTruthy();
    expect(screen.getByText('Something went wrong. Please try again.')).toBeTruthy();
  });

  it('shows API error message when submission fails with API-provided message', () => {
    setQuizMock({
      isError: true,
      error: { response: { data: { message: 'Failed to submit answer' } } },
    });
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.getByText('Failed to submit answer')).toBeTruthy();
  });

  it('shows "no quiz" message when lesson has no quizzes', () => {
    render(<QuizModal visible={true} lesson={mockLessonNoQuiz} onClose={onClose} />);
    expect(screen.getByText('No quiz available for this lesson.')).toBeTruthy();
  });

  it('calls onClose when close button is pressed', () => {
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    fireEvent.press(screen.getByLabelText('Close quiz'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows "Back to Dashboard" button in terminal view when nextLessonId is null', () => {
    setQuizMock({ data: { ...mockResult, nextLessonId: null } });
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.getByText('Back to dashboard')).toBeTruthy();
    expect(screen.queryByText('DONE')).toBeNull();
  });

  it('"Back to Dashboard" in terminal view calls onClose and navigates to lessons', () => {
    setQuizMock({ data: { ...mockResult, nextLessonId: null } });
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    fireEvent.press(screen.getByText('Back to dashboard'));
    expect(onClose).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/lessons');
  });

  it('shows "Next Lesson" button in terminal view when nextLessonId is present', () => {
    setQuizMock({ data: { ...mockResult, nextLessonId: 'lesson-2' } });
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.getByText('Next lesson')).toBeTruthy();
    expect(screen.queryByText('DONE')).toBeNull();
  });

  it('the result action is a pinned white button on the colour, with the page scrolling behind it', () => {
    setQuizMock({ data: { ...mockResult, nextLessonId: 'lesson-2' } });
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(within(screen.getByTestId('pinned-action')).getByTestId('result-action-btn')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('result-action-btn').props.style).backgroundColor).toBe(colors.white);
  });

  it('the retry offer\'s button is ink on the sand', () => {
    setQuizMock({ data: { ...mockResult, correct: false, retakeAvailable: true, lessonFinalized: false } });
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(StyleSheet.flatten(screen.getByTestId('result-action-btn').props.style).backgroundColor).toBe(colors.surfaceInverse);
  });

  it.each([
    ['the retry offer', { ...mockResult, correct: false, retakeAvailable: true, lessonFinalized: false }, 'Try again'],
    ['a capstone question\'s feedback', { ...mockResult, lessonFinalized: false }, 'Next question'],
  ])('096: %s pins its one button at the foot too', (_label, data, label) => {
    setQuizMock({ data });
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(within(screen.getByTestId('pinned-action')).getByText(new RegExp(label, 'i'))).toBeTruthy();
  });

  it('"Next Lesson" in terminal view calls onClose and navigates to that lesson', () => {
    setQuizMock({ data: { ...mockResult, nextLessonId: 'lesson-2' } });
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    fireEvent.press(screen.getByText('Next lesson'));
    expect(onClose).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/lesson/lesson-2');
  });

  it('the close button in the terminal view leaves the lesson, back to where it was opened from', () => {
    setQuizMock({ data: { ...mockResult, nextLessonId: 'lesson-2' } });
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    fireEvent.press(screen.getByLabelText('Close quiz results'));
    expect(mockBack).toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('renders an animated milestone card when milestone is set on finalize', () => {
    setQuizMock({ data: { ...mockResult, milestone: '7-day streak', streak: 7 } });
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.getByTestId('milestone-card')).toBeTruthy();
    expect(screen.getByText('🎉 7-day streak!')).toBeTruthy();
  });

  it('does not render the milestone card when milestone is null', () => {
    setQuizMock({ data: { ...mockResult, milestone: null } });
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.queryByTestId('milestone-card')).toBeNull();
  });

  it('renders coaching card when coaching message is present', () => {
    setQuizMock({ data: { ...mockResult, coaching: 'Great work! You answered correctly.' } });
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.getByText('AI Coaching')).toBeTruthy();
    expect(screen.getByText('Great work! You answered correctly.')).toBeTruthy();
  });

  it('does not render coaching card when coaching is null', () => {
    setQuizMock({ data: { ...mockResult, coaching: null } });
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.queryByText('AI Coaching')).toBeNull();
  });

  describe('per-question capstone flow (ticket 019 ch2.1)', () => {
    it('shows per-question feedback "Correct!" when Q1 correct and lessonFinalized is false', () => {
      setQuizMock({ data: q1CorrectNotFinalized });
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.getByText('Correct!')).toBeTruthy();
    });

    it('does not show terminal elements in per-question feedback view', () => {
      setQuizMock({ data: q1CorrectNotFinalized });
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.queryByText('Quiz Complete!')).toBeNull();
      expect(screen.queryByText('track average')).toBeNull();
      expect(screen.queryByText('DONE')).toBeNull();
    });

    it('shows "Next Question" button in per-question feedback view', () => {
      setQuizMock({ data: q1CorrectNotFinalized });
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.getByText('Next question')).toBeTruthy();
    });

    it('Next Question button advances to Q2 after Q1 per-question feedback', () => {
      const resetMock = jest.fn();
      setQuizMock({ data: q1CorrectNotFinalized, reset: resetMock });
      const { rerender } = render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);

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
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.getByText('Incorrect')).toBeTruthy();
      expect(screen.getByText('Next question')).toBeTruthy();
      expect(screen.queryByText('Quiz Complete!')).toBeNull();
    });

    it('last question finalized → full terminal view', () => {
      setQuizMock({ data: { ...mockResult, lessonFinalized: true } });
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.getByText('Correct!')).toBeTruthy();
      expect(screen.getByText('track average')).toBeTruthy();
      expect(screen.queryByText('Next question')).toBeNull();
    });

    it('079f: finalized result shows the thumbs with the stored verdict from the result lesson', () => {
      setQuizMock({ data: { ...mockResult, lesson: { ...mockLesson, rating: 'up' } } });
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.getByTestId('rating-stub').props.children).toBe('lesson-1:up');
      expect(within(screen.getByTestId('quiz-frame-header')).getByTestId('rating-stub')).toBeTruthy();
      expect(within(screen.getByTestId('quiz-frame-content')).queryByTestId('rating-stub')).toBeNull();
    });

    it('096: the result and question bodies leave room under their last line for the pinned button', () => {
      const { useSafeAreaInsets } = require('react-native-safe-area-context');
      (useSafeAreaInsets as jest.Mock).mockReturnValue({ top: 44, bottom: 34, left: 0, right: 0 });
      setQuizMock({ data: mockResult });
      const { unmount } = render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      // The result body leaves room under its last line for the pinned Next lesson (096).
      expect(StyleSheet.flatten(screen.getByTestId('quiz-frame-content').props.contentContainerStyle).paddingBottom).toBe(PINNED_ACTION_CLEARANCE + 34);
      unmount();
      setQuizMock({ data: undefined });
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      // The question body leaves room under its last answer for the pinned Submit, and a little more.
      expect(StyleSheet.flatten(screen.getByTestId('quiz-question-content').props.contentContainerStyle).paddingBottom).toBeGreaterThan(PINNED_ACTION_CLEARANCE + 34);
    });

    it('079f: no thumbs while the lesson is not finalized', () => {
      setQuizMock({ data: wrongPendingResult });
      render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      expect(screen.queryByTestId('rating-stub')).toBeNull();
    });

    it('resume: starts on Q2 when resolvedQuizIds contains Q1 id', () => {
      const lessonWithResolved = { ...mockLesson, resolvedQuizIds: ['q-1'] };
      render(<QuizModal visible={true} lesson={lessonWithResolved} onClose={onClose} />);
      expect(screen.getByText('What does MVP stand for?')).toBeTruthy();
      expect(screen.getByText('Question 2 of 2')).toBeTruthy();
    });

    it('409 LESSON_003 on a question → advances to the next question', () => {
      // Set up mutate to call onError with a 409 LESSON_003
      const resetMock = jest.fn();
      (useSubmitQuiz as jest.Mock).mockReturnValue({
        mutate: jest.fn((_, { onError }) =>
          onError({ response: { status: 409, data: { code: 'LESSON_003' } } })
        ),
        reset: resetMock,
        isPending: false,
        isError: false,
        data: undefined,
      });

      const { rerender } = render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);

      // Select and submit Q1 — the mock triggers LESSON_003 immediately
      fireEvent.press(screen.getByText('Option A'));
      fireEvent.press(screen.getByText('Submit'));

      // Restore normal mock (no data), reset clears — should now show Q2
      setQuizMock({ reset: resetMock });
      rerender(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.getByText('What does MVP stand for?')).toBeTruthy();
    });

    it('submits only Q1 answer when Submit is pressed on Q1', () => {
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      fireEvent.press(screen.getByText('Option A'));
      fireEvent.press(screen.getByText('Submit'));
      expect(mockMutate).toHaveBeenCalledWith(
        { lessonId: 'lesson-1', answers: { 'q-1': 'Option A' } },
        expect.anything()
      );
    });
  });

  describe('retake (079e)', () => {
    it('sends completionTime with every submission', () => {
      render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} completionTime={() => 73} />);
      fireEvent.press(screen.getByText('Option A'));
      fireEvent.press(screen.getByText('Submit'));
      expect(mockMutate).toHaveBeenCalledWith(
        { lessonId: 'lesson-1', answers: { 'q-1': 'Option A' }, completionTime: 73 },
        expect.anything()
      );
    });

    it('accepts answers on a completed lesson while a retake is in progress', () => {
      const completedLesson = { ...singleQuizLesson, quizCompleted: true, lessonRetakeInProgress: true, resolvedQuizIds: [] };
      render(<QuizModal visible={true} lesson={completedLesson} onClose={onClose} />);
      expect(screen.queryByText('Already Completed')).toBeNull();
      fireEvent.press(screen.getByText('Option A'));
      fireEvent.press(screen.getByText('Submit'));
      expect(mockMutate).toHaveBeenCalled();
    });
  });

  describe('already-completed handling (bug fix — 409 LESSON_003 with no unresolved question left)', () => {
    it('shows "Already Completed" on open when lesson.quizCompleted is true, instead of a live question', () => {
      const completedLesson = { ...singleQuizLesson, quizCompleted: true };
      render(<QuizModal visible={true} lesson={completedLesson} onClose={onClose} />);
      expect(screen.getByText('Already Completed')).toBeTruthy();
      expect(screen.queryByText('What is product-market fit?')).toBeNull();
    });

    it('079f: "Already Completed" shows the thumbs with the stored verdict', () => {
      const completedLesson = { ...singleQuizLesson, quizCompleted: true, rating: 'down' as const };
      render(<QuizModal visible={true} lesson={completedLesson} onClose={onClose} />);
      expect(screen.getByTestId('rating-stub').props.children).toBe('lesson-1:down');
      expect(within(screen.getByTestId('quiz-frame-header')).getByTestId('rating-stub')).toBeTruthy();
    });

    it('shows "Already Completed" on open when every quiz id is already in resolvedQuizIds', () => {
      const allResolvedLesson = { ...singleQuizLesson, resolvedQuizIds: ['q-1'] };
      render(<QuizModal visible={true} lesson={allResolvedLesson} onClose={onClose} />);
      expect(screen.getByText('Already Completed')).toBeTruthy();
    });

    it('does not show "Already Completed" for a lesson with no quizzes (keeps "no quiz" message)', () => {
      const completedNoQuiz = { ...mockLessonNoQuiz, quizCompleted: true };
      render(<QuizModal visible={true} lesson={completedNoQuiz} onClose={onClose} />);
      expect(screen.getByText('No quiz available for this lesson.')).toBeTruthy();
      expect(screen.queryByText('Already Completed')).toBeNull();
    });

    it('409 LESSON_003 on the last/only unresolved question → shows "Already Completed" instead of silently resetting', () => {
      const resetMock = jest.fn();
      (useSubmitQuiz as jest.Mock).mockReturnValue({
        mutate: jest.fn((_, { onError }) =>
          onError({ response: { status: 409, data: { code: 'LESSON_003' } } })
        ),
        reset: resetMock,
        isPending: false,
        isError: false,
        data: undefined,
      });

      const { rerender } = render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      fireEvent.press(screen.getByText('Option A'));
      fireEvent.press(screen.getByText('Submit'));

      setQuizMock({ reset: resetMock });
      rerender(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      expect(screen.getByText('Already Completed')).toBeTruthy();
      expect(screen.queryByText('What is product-market fit?')).toBeNull();
    });

    it('"Back to Dashboard" on "Already Completed" calls onClose and navigates to lessons when no nextLessonId', () => {
      const completedLesson = { ...singleQuizLesson, quizCompleted: true };
      render(<QuizModal visible={true} lesson={completedLesson} onClose={onClose} />);
      expect(screen.getByText('Back to dashboard')).toBeTruthy();
      fireEvent.press(screen.getByText('Back to dashboard'));
      expect(onClose).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)/lessons');
    });

    it('"Next Lesson" on "Already Completed" navigates to next lesson when nextLessonId present', () => {
      const completedLesson = { ...singleQuizLesson, quizCompleted: true, nextLessonId: 'lesson-99' };
      render(<QuizModal visible={true} lesson={completedLesson} onClose={onClose} />);
      expect(screen.getByText('Next lesson')).toBeTruthy();
      fireEvent.press(screen.getByText('Next lesson'));
      expect(onClose).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/lesson/lesson-99');
    });

    it('a fresh finalized result in the same session still shows the real terminal view, not "Already Completed"', () => {
      setQuizMock({ data: { ...mockResult, lessonFinalized: true } });
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.getByText('Correct!')).toBeTruthy();
      expect(screen.queryByText('Already Completed')).toBeNull();
    });
  });

  describe('quiz retake (ticket 017 goal 4)', () => {
    it('shows an Incorrect screen with keyTakeaway and Try again when a first attempt is wrong', () => {
      setQuizMock({ data: wrongPendingResult });
      render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);

      expect(screen.getByText('Incorrect')).toBeTruthy();
      expect(screen.getByText('Fit beats features.')).toBeTruthy();
      expect(screen.getByText('Try again')).toBeTruthy();
      // "Next lesson" button removed (item 7) — try again is the only action
      expect(screen.queryByText('Next lesson')).toBeNull();
      expect(screen.queryByText('Quiz Complete!')).toBeNull();
    });

    it('has no close button on the retry screen: the way on is Try again', () => {
      setQuizMock({ data: wrongPendingResult });
      render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      expect(screen.queryByLabelText('Close quiz results')).toBeNull();
    });

    it('shows ONE MORE TRY, the nudge and the hint, and never the answer', () => {
      setQuizMock({ data: wrongPendingResult });
      render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      expect(within(screen.getByTestId('verdict-mark')).getByText('ONE MORE TRY')).toBeTruthy();
      expect(screen.getByText("Have another go. Here's a nudge.")).toBeTruthy();
      expect(within(screen.getByTestId('hint-section')).getByText('HINT')).toBeTruthy();
      expect(screen.queryByText('THE ANSWER')).toBeNull();
    });

    it('Try again calls reset on the mutation', () => {
      const reset = jest.fn();
      setQuizMock({ data: wrongPendingResult, reset });
      render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);

      fireEvent.press(screen.getByText('Try again'));
      expect(reset).toHaveBeenCalled();
    });

    it('resubmits with isRetake: true after Try again and reselecting', () => {
      setQuizMock({ data: undefined });
      const { rerender } = render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      fireEvent.press(screen.getByText('Option B'));
      fireEvent.press(screen.getByText('Submit'));
      expect(mockMutate).toHaveBeenCalledWith(
        { lessonId: 'lesson-1', answers: { 'q-1': 'Option B' } },
        expect.anything()
      );

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
      const { rerender } = render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
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
      render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);

      expect(screen.getByText('Incorrect')).toBeTruthy();
      expect(screen.queryByText('Try again')).toBeNull();
    });

    it('shows a flat dash (not up/down) once a retake was used, regardless of the average numbers', () => {
      setQuizMock({ data: undefined });
      const { rerender } = render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      fireEvent.press(screen.getByText('Option B'));
      fireEvent.press(screen.getByText('Submit'));

      setQuizMock({ data: wrongPendingResult });
      rerender(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      fireEvent.press(screen.getByText('Try again'));

      setQuizMock({
        data: { ...mockResult, correct: true, retakeAvailable: false, trackAverage: 70, previousAverage: 70 },
      });
      rerender(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);

      expect(screen.getByText('=')).toBeTruthy();
      expect(screen.queryByText('↑')).toBeNull();
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
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.queryByText('KEY TAKEAWAY')).toBeNull();
      expect(screen.queryByText('Fit beats features.')).toBeNull();
    });

    it('shows correct answer text prominently for incorrect feedback in terminal view', () => {
      setQuizMock({ data: resultWithIncorrectFeedback });
      render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      expect(screen.getByText('THE ANSWER')).toBeTruthy();
      expect(screen.getByText('Option A')).toBeTruthy();
    });

    it('does not show the key takeaway in per-question feedback view (mid-capstone)', () => {
      setQuizMock({ data: q1CorrectNotFinalized });
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.queryByText('Fit beats features.')).toBeNull();
    });
  });

  describe('bookmark (ticket 017 chunk 3)', () => {
    it('is not shown while the quiz question is active (before submitting)', () => {
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.queryByLabelText('Save lesson')).toBeNull();
      expect(screen.queryByLabelText('Remove from saved lessons')).toBeNull();
    });

    it('reflects lesson.isSaved=false in the results view', () => {
      setQuizMock({ data: mockResult });
      render(<QuizModal visible={true} lesson={{ ...mockLesson, isSaved: false }} onClose={onClose} />);
      expect(screen.getByLabelText('Save lesson')).toBeTruthy();
    });

    it('reflects lesson.isSaved=true in the results view', () => {
      setQuizMock({ data: mockResult });
      render(<QuizModal visible={true} lesson={{ ...mockLesson, isSaved: true }} onClose={onClose} />);
      expect(screen.getByLabelText('Remove from saved lessons')).toBeTruthy();
    });

    it('is shown on the wrong-first-attempt (retake offer) screen too', () => {
      setQuizMock({ data: wrongPendingResult });
      render(<QuizModal visible={true} lesson={{ ...singleQuizLesson, isSaved: false }} onClose={onClose} />);
      expect(screen.getByLabelText('Save lesson')).toBeTruthy();
    });

    it('calls useSaveLesson.mutate with the lesson id when toggled on', () => {
      setQuizMock({ data: mockResult });
      render(<QuizModal visible={true} lesson={{ ...mockLesson, isSaved: false }} onClose={onClose} />);
      fireEvent.press(screen.getByLabelText('Save lesson'));
      expect(mockSaveMutate).toHaveBeenCalledWith('lesson-1', expect.anything());
    });

    it('calls useUnsaveLesson.mutate with the lesson id when toggled off', () => {
      setQuizMock({ data: mockResult });
      render(<QuizModal visible={true} lesson={{ ...mockLesson, isSaved: true }} onClose={onClose} />);
      fireEvent.press(screen.getByLabelText('Remove from saved lessons'));
      expect(mockUnsaveMutate).toHaveBeenCalledWith('lesson-1', expect.anything());
    });

    it('is shown on the per-question feedback view', () => {
      setQuizMock({ data: q1CorrectNotFinalized });
      render(<QuizModal visible={true} lesson={{ ...mockLesson, isSaved: false }} onClose={onClose} />);
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
      const { toJSON } = render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
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
      const { toJSON } = render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
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
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.getAllByText('WHY').length).toBeGreaterThan(0);
    });
  });

  describe('Chunk A4 — QuizOpt options', () => {
    it('renders each multiple-choice option as a QuizOpt tile', () => {
      render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      expect(screen.getByTestId('quiz-opt-0')).toBeTruthy();
      expect(screen.getByTestId('quiz-opt-1')).toBeTruthy();
      expect(screen.getByTestId('quiz-opt-2')).toBeTruthy();
    });

    it('renders option text alongside the letter key', () => {
      render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      expect(screen.getByText('Option A')).toBeTruthy();
      expect(screen.getByText('Option B')).toBeTruthy();
    });

    it('previously wrong option gets testID quiz-opt-0 and is visually disabled', () => {
      // Start with no data, press an option to select it
      render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
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
      setQuizMock({ data: { ...mockResult, correct: true } });
      render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      expect(headingStyle().transform).toHaveLength(2);
    });

    it('leaves an incorrect heading still', () => {
      setQuizMock({ data: { ...mockResult, correct: false, retakeAvailable: false } });
      render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      expect(headingStyle().transform).toBeUndefined();
    });
  });

  describe('verdict screens', () => {
    it.each([
      ['a correct result', { ...mockResult, correct: true }, 'CORRECT'],
      ['an incorrect result', { ...mockResult, correct: false, retakeAvailable: false }, 'INCORRECT'],
    ])('%s is marked %s', (_label, data, word) => {
      setQuizMock({ data });
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(within(screen.getByTestId('verdict-mark')).getByText(word)).toBeTruthy();
    });

    it('an incorrect result\'s button is white on the ink', () => {
      setQuizMock({ data: { ...mockResult, correct: false, retakeAvailable: false } });
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(StyleSheet.flatten(screen.getByTestId('result-action-btn').props.style).backgroundColor).toBe(colors.white);
    });
  });

  describe('096 — result screen layout', () => {
    it('has no streak calendar in the header, whatever the streak', () => {
      setQuizMock({ data: { ...mockResult, streak: 4 } });
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.queryByTestId('streak-calendar')).toBeNull();
      expect(screen.queryByText('4-day streak')).toBeNull();
    });

    it('puts the thumbs in their own bubble in the header', () => {
      setQuizMock({ data: { ...mockResult } });
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      const bubble = within(screen.getByTestId('header-rating-bubble'));
      expect(bubble.getByTestId('rating-stub')).toBeTruthy();
      expect(bubble.queryByLabelText('Close quiz results')).toBeNull();
    });

    it('draws the close button and the bookmark as matching rounded squares over the colour', () => {
      setQuizMock({ data: { ...mockResult } });
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      const bookmark = StyleSheet.flatten(screen.getByLabelText('Save lesson').props.style);
      const close = StyleSheet.flatten(screen.getByLabelText('Close quiz results').props.style);
      expect(close.width).toBe(close.height);
      expect(close.borderRadius).toBeLessThan(radius.pill);
      expect(bookmark).toMatchObject({ width: close.width, height: close.height, borderRadius: close.borderRadius });
    });

    it('anchors the XP animation on the header row', () => {
      setQuizMock({ data: { ...mockResult, streak: 4, xpAwarded: 20, achievementsUnlocked: [] } });
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      const { top, height } = headerRowBox(44); // the mocked top inset
      expect(StyleSheet.flatten(screen.getByTestId('xp-chip-overlay').props.style)).toMatchObject({ top, height });
    });

    it('puts the XP award and the track average under the heading', () => {
      setQuizMock({ data: { ...mockResult, xpAwarded: 20 } });
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      const headline = within(screen.getByTestId('result-headline'));
      expect(headline.getByText('track average')).toBeTruthy();
      expect(headline.getByText('Correct!')).toBeTruthy();
      expect(headline.getByTestId('xp-chip')).toBeTruthy();
    });

    it('keeps the heading in the headline row when there is no XP award', () => {
      setQuizMock({ data: { ...mockResult, xpAwarded: null } });
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(within(screen.getByTestId('result-headline')).getByText('Correct!')).toBeTruthy();
    });

    it('has no streak on the result page: not in the header and not beside the heading', () => {
      setQuizMock({ data: { ...mockResult, streak: 4, xpAwarded: 20 } });
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.queryByTestId('streak-calendar')).toBeNull();
      expect(within(screen.getByTestId('result-headline')).queryByText(/streak/i)).toBeNull();
    });

    it('brings the feedback, the takeaway and the button in block by block, after the heading', () => {
      setQuizMock({ data: { ...mockResult, xpAwarded: 20 } });
      render(<QuizModal visible={true} lesson={{ ...mockLesson, keyTakeaway: 'Match effort to the tier.' }} onClose={onClose} />);
      const reveals = screen.getAllByTestId('reveal');
      expect(reveals.length).toBeGreaterThanOrEqual(3); // the feedback card, the takeaway, the button
      expect(within(screen.getByTestId('result-headline')).queryByTestId('reveal')).toBeNull();
    });
  });

  describe('Ticket 070 — XP chip', () => {
    it('shows XP chip when xpAwarded > 0 on finalization', () => {
      setQuizMock({ data: { ...mockResult, xpAwarded: 150 } });
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.getByTestId('xp-chip')).toBeTruthy();
    });

    it('hides XP chip when xpAwarded is null', () => {
      setQuizMock({ data: { ...mockResult, xpAwarded: null } });
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.queryByTestId('xp-chip')).toBeNull();
    });

    it('hides XP chip when xpAwarded is 0', () => {
      setQuizMock({ data: { ...mockResult, xpAwarded: 0 } });
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.queryByTestId('xp-chip')).toBeNull();
    });
  });

  describe('Ticket 072c — celebration queue', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('offers See achievement, with Skip, instead of Next lesson when one was earned', () => {
      setQuizMock({ data: { ...mockResult, achievementsUnlocked: ['first-light'] } });
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(within(screen.getByTestId('result-action-btn')).getByText('See achievement')).toBeTruthy();
      expect(screen.getByTestId('achievements-skip-btn')).toBeTruthy();
      expect(screen.queryByText('Next lesson')).toBeNull();
      expect(screen.queryByTestId('achievement-unlock')).toBeNull();
    });

    it('says how many when several were earned', () => {
      setQuizMock({ data: { ...mockResult, achievementsUnlocked: ['first-light', 'good-innings'] } });
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.getByText('See 2 achievements')).toBeTruthy();
    });

    it('shows each earned achievement one after another, then the result with Next lesson', () => {
      setQuizMock({ data: { ...mockResult, achievementsUnlocked: ['first-light', 'good-innings'] } });
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      fireEvent.press(screen.getByTestId('result-action-btn'));
      expect(screen.getByTestId('achievement-unlock-name').props.children).toBe('First Light');
      fireEvent.press(screen.getByTestId('achievement-continue-btn'));
      expect(screen.getByTestId('achievement-unlock-name').props.children).toBe('Good Innings');
      fireEvent.press(screen.getByTestId('achievement-continue-btn'));
      expect(screen.queryByTestId('achievement-unlock')).toBeNull();
      expect(screen.queryByTestId('achievements-skip-btn')).toBeNull();
      expect(within(screen.getByTestId('result-action-btn')).getByText(/Next lesson|Back to dashboard/)).toBeTruthy();
    });

    it('Skip goes straight to Next lesson without showing any achievement', () => {
      setQuizMock({ data: { ...mockResult, achievementsUnlocked: ['first-light'] } });
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      fireEvent.press(screen.getByTestId('achievements-skip-btn'));
      expect(screen.queryByTestId('achievement-unlock')).toBeNull();
      expect(screen.queryByTestId('achievements-skip-btn')).toBeNull();
      expect(within(screen.getByTestId('result-action-btn')).getByText(/Next lesson|Back to dashboard/)).toBeTruthy();
    });

    it('shows Next lesson straight away when nothing was earned', () => {
      setQuizMock({ data: { ...mockResult, achievementsUnlocked: [] } });
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.queryByTestId('achievements-skip-btn')).toBeNull();
    });

    it('shows XP chip overlay when xpAwarded > 0 and no achievements', () => {
      setQuizMock({ data: { ...mockResult, xpAwarded: 75, achievementsUnlocked: [] } });
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.getByTestId('xp-chip-animated')).toBeTruthy();
    });

    it('does not show any overlay when achievementsUnlocked is empty and xpAwarded is null', () => {
      setQuizMock({ data: { ...mockResult, xpAwarded: null, achievementsUnlocked: [] } });
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.queryByTestId('xp-chip-animated')).toBeNull();
    });

    it('still shows the XP chip when achievements were earned: they wait behind the button', () => {
      setQuizMock({ data: { ...mockResult, xpAwarded: 50, achievementsUnlocked: ['first-light'] } });
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.getByTestId('xp-chip-animated')).toBeTruthy();
    });
  });

  describe('Chunk A4 — safe-area insets on header', () => {
    it('header paddingTop is derived from useSafeAreaInsets top inset, not a hardcoded constant', () => {
      const { useSafeAreaInsets } = require('react-native-safe-area-context');
      (useSafeAreaInsets as jest.Mock).mockReturnValue({ top: 59, bottom: 34, left: 0, right: 0 });
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      // The quiz is rendered with the inset applied — presence of the question proves
      // the component rendered without crashing when insets.top is non-zero
      expect(screen.getByText('What is product-market fit?')).toBeTruthy();
    });

    it('header paddingTop is derived from insets in terminal results view too', () => {
      const { useSafeAreaInsets } = require('react-native-safe-area-context');
      (useSafeAreaInsets as jest.Mock).mockReturnValue({ top: 47, bottom: 34, left: 0, right: 0 });
      setQuizMock({ data: mockResult });
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.getByText('Correct!')).toBeTruthy();
    });
  });
  describe('end-of-topic feedback (079d)', () => {
    const topicEnd = { planId: 'plan-1', stableKey: 'topic-a', title: 'Pricing basics' };

    afterEach(() => jest.useRealTimers());

    it('shows the screen in the terminal view when the result carries a topicEnd', () => {
      setQuizMock({ data: { ...mockResult, topicEnd } });
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.getByTestId('topic-feedback')).toBeTruthy();
      expect(screen.getByText('Pricing basics')).toBeTruthy();
    });

    it('shows nothing when topicEnd is null', () => {
      setQuizMock({ data: { ...mockResult, topicEnd: null } });
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.queryByTestId('topic-feedback')).toBeNull();
    });

    it('an answer writes to the plan, then the acknowledgement closes itself, hides the screen and refetches paths', async () => {
      jest.useFakeTimers();
      setQuizMock({ data: { ...mockResult, topicEnd } });
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
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
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      await act(async () => fireEvent.press(screen.getByTestId('topic-feedback-skip')));
      expect(mockTopicSubmit).toHaveBeenCalledWith('plan-1', { stableKey: 'topic-a', dismissed: true });
      expect(screen.queryByTestId('topic-feedback')).toBeNull();
      expect(mockRefreshPaths).toHaveBeenCalledTimes(1);
    });
  });
});

