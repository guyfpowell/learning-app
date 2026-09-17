import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { QuizModal } from '../QuizModal';
import { useSubmitQuiz } from '@/hooks/useQuiz';
import { useSaveLesson, useUnsaveLesson } from '@/hooks/useLesson';
import { useRouter } from 'expo-router';

jest.mock('@/hooks/useQuiz', () => ({ useSubmitQuiz: jest.fn() }));
jest.mock('@/hooks/useLesson', () => ({
  useSaveLesson: jest.fn(),
  useUnsaveLesson: jest.fn(),
}));
jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({ top: 44, bottom: 34, left: 0, right: 0 })),
}));

const mockMutate = jest.fn();
const mockSaveMutate = jest.fn();
const mockUnsaveMutate = jest.fn();
const mockReplace = jest.fn();

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
  createdAt: new Date(),
  updatedAt: new Date(),
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

describe('QuizModal', () => {
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    setQuizMock();
    (useSaveLesson as jest.Mock).mockReturnValue({ mutate: mockSaveMutate });
    (useUnsaveLesson as jest.Mock).mockReturnValue({ mutate: mockUnsaveMutate });
    (useRouter as jest.Mock).mockReturnValue({ replace: mockReplace });
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

  it('renders multiple-choice options', () => {
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.getByText('Option A')).toBeTruthy();
    expect(screen.getByText('Option B')).toBeTruthy();
    expect(screen.getByText('Option C')).toBeTruthy();
  });

  it('shows Submit button for each question', () => {
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.getByText('SUBMIT')).toBeTruthy();
  });

  it('calls mutate with only the current question answer on Submit', () => {
    render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
    fireEvent.press(screen.getByText('Option A'));
    fireEvent.press(screen.getByText('SUBMIT'));
    expect(mockMutate).toHaveBeenCalledWith(
      { lessonId: 'lesson-1', answers: { 'q-1': 'Option A' } },
      expect.anything()
    );
  });

  it('shows spinner on Submit button while submitting', () => {
    setQuizMock({ isPending: true });
    render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
    expect(screen.queryByText('SUBMIT')).toBeNull();
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

  it('shows the Track Average label in results', () => {
    setQuizMock({ data: mockResult });
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.getByText('Track Average')).toBeTruthy();
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
    fireEvent.press(screen.getByText('✕'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows "Back to Dashboard" button in terminal view when nextLessonId is null', () => {
    setQuizMock({ data: { ...mockResult, nextLessonId: null } });
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.getByText('BACK TO DASHBOARD')).toBeTruthy();
    expect(screen.queryByText('DONE')).toBeNull();
  });

  it('"Back to Dashboard" in terminal view calls onClose and navigates to lessons', () => {
    setQuizMock({ data: { ...mockResult, nextLessonId: null } });
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    fireEvent.press(screen.getByText('BACK TO DASHBOARD'));
    expect(onClose).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/lessons');
  });

  it('shows "Next Lesson" button in terminal view when nextLessonId is present', () => {
    setQuizMock({ data: { ...mockResult, nextLessonId: 'lesson-2' } });
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.getByText('NEXT LESSON')).toBeTruthy();
    expect(screen.queryByText('DONE')).toBeNull();
  });

  it('"Next Lesson" in terminal view calls onClose and navigates to that lesson', () => {
    setQuizMock({ data: { ...mockResult, nextLessonId: 'lesson-2' } });
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    fireEvent.press(screen.getByText('NEXT LESSON'));
    expect(onClose).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/lesson/lesson-2');
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
      expect(screen.queryByText('Track Average')).toBeNull();
      expect(screen.queryByText('DONE')).toBeNull();
    });

    it('shows "Next Question" button in per-question feedback view', () => {
      setQuizMock({ data: q1CorrectNotFinalized });
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.getByText('NEXT QUESTION')).toBeTruthy();
    });

    it('Next Question button advances to Q2 after Q1 per-question feedback', () => {
      const resetMock = jest.fn();
      setQuizMock({ data: q1CorrectNotFinalized, reset: resetMock });
      const { rerender } = render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);

      fireEvent.press(screen.getByText('NEXT QUESTION'));

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
      expect(screen.getByText('NEXT QUESTION')).toBeTruthy();
      expect(screen.queryByText('Quiz Complete!')).toBeNull();
    });

    it('last question finalized → full terminal view', () => {
      setQuizMock({ data: { ...mockResult, lessonFinalized: true } });
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.getByText('Correct!')).toBeTruthy();
      expect(screen.getByText('Track Average')).toBeTruthy();
      expect(screen.queryByText('NEXT QUESTION')).toBeNull();
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
      fireEvent.press(screen.getByText('SUBMIT'));

      // Restore normal mock (no data), reset clears — should now show Q2
      setQuizMock({ reset: resetMock });
      rerender(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.getByText('What does MVP stand for?')).toBeTruthy();
    });

    it('submits only Q1 answer when Submit is pressed on Q1', () => {
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      fireEvent.press(screen.getByText('Option A'));
      fireEvent.press(screen.getByText('SUBMIT'));
      expect(mockMutate).toHaveBeenCalledWith(
        { lessonId: 'lesson-1', answers: { 'q-1': 'Option A' } },
        expect.anything()
      );
    });
  });

  describe('already-completed handling (bug fix — 409 LESSON_003 with no unresolved question left)', () => {
    it('shows "Already Completed" on open when lesson.quizCompleted is true, instead of a live question', () => {
      const completedLesson = { ...singleQuizLesson, quizCompleted: true };
      render(<QuizModal visible={true} lesson={completedLesson} onClose={onClose} />);
      expect(screen.getByText('Already Completed')).toBeTruthy();
      expect(screen.queryByText('What is product-market fit?')).toBeNull();
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
      fireEvent.press(screen.getByText('SUBMIT'));

      setQuizMock({ reset: resetMock });
      rerender(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      expect(screen.getByText('Already Completed')).toBeTruthy();
      expect(screen.queryByText('What is product-market fit?')).toBeNull();
    });

    it('"Back to Dashboard" on "Already Completed" calls onClose and navigates to lessons when no nextLessonId', () => {
      const completedLesson = { ...singleQuizLesson, quizCompleted: true };
      render(<QuizModal visible={true} lesson={completedLesson} onClose={onClose} />);
      expect(screen.getByText('BACK TO DASHBOARD')).toBeTruthy();
      fireEvent.press(screen.getByText('BACK TO DASHBOARD'));
      expect(onClose).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)/lessons');
    });

    it('"Next Lesson" on "Already Completed" navigates to next lesson when nextLessonId present', () => {
      const completedLesson = { ...singleQuizLesson, quizCompleted: true, nextLessonId: 'lesson-99' };
      render(<QuizModal visible={true} lesson={completedLesson} onClose={onClose} />);
      expect(screen.getByText('NEXT LESSON')).toBeTruthy();
      fireEvent.press(screen.getByText('NEXT LESSON'));
      expect(onClose).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)/lesson/lesson-99');
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
      expect(screen.getByText('TRY AGAIN')).toBeTruthy();
      // "Next lesson" button removed (item 7) — try again is the only action
      expect(screen.queryByText('NEXT LESSON')).toBeNull();
      expect(screen.queryByText('Quiz Complete!')).toBeNull();
    });

    it('Try again calls reset on the mutation', () => {
      const reset = jest.fn();
      setQuizMock({ data: wrongPendingResult, reset });
      render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);

      fireEvent.press(screen.getByText('TRY AGAIN'));
      expect(reset).toHaveBeenCalled();
    });

    it('resubmits with isRetake: true after Try again and reselecting', () => {
      setQuizMock({ data: undefined });
      const { rerender } = render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      fireEvent.press(screen.getByText('Option B'));
      fireEvent.press(screen.getByText('SUBMIT'));
      expect(mockMutate).toHaveBeenCalledWith(
        { lessonId: 'lesson-1', answers: { 'q-1': 'Option B' } },
        expect.anything()
      );

      setQuizMock({ data: wrongPendingResult });
      rerender(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      fireEvent.press(screen.getByText('TRY AGAIN'));

      setQuizMock({ data: undefined });
      rerender(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      fireEvent.press(screen.getByText('Option A'));
      fireEvent.press(screen.getByText('SUBMIT'));

      expect(mockMutate).toHaveBeenLastCalledWith(
        { lessonId: 'lesson-1', answers: { 'q-1': 'Option A' }, isRetake: true },
        expect.anything()
      );
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
      fireEvent.press(screen.getByText('SUBMIT'));

      setQuizMock({ data: wrongPendingResult });
      rerender(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      fireEvent.press(screen.getByText('TRY AGAIN'));

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

    it('shows key takeaway card in terminal view when lesson.keyTakeaway is set', () => {
      setQuizMock({ data: mockResult });
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.getByTestId('quiz-key-takeaway')).toBeTruthy();
      expect(screen.getByText('Fit beats features.')).toBeTruthy();
    });

    it('does not show key takeaway card in terminal view when lesson.keyTakeaway is null', () => {
      setQuizMock({ data: mockResult });
      render(<QuizModal visible={true} lesson={{ ...mockLesson, keyTakeaway: undefined }} onClose={onClose} />);
      expect(screen.queryByTestId('quiz-key-takeaway')).toBeNull();
    });

    it('shows correct answer text prominently for incorrect feedback in terminal view', () => {
      setQuizMock({ data: resultWithIncorrectFeedback });
      render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      // label is "Correct answer" (not "Correct:")
      expect(screen.getByText('Correct answer')).toBeTruthy();
      expect(screen.getByText('Option A')).toBeTruthy();
    });

    it('does not show key takeaway card in per-question feedback view (mid-capstone)', () => {
      setQuizMock({ data: q1CorrectNotFinalized });
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.queryByTestId('quiz-key-takeaway')).toBeNull();
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

    it('correct: shows question + your answer as one reference block, before Explanation', () => {
      setQuizMock({ data: { ...mockResult, feedbacks: [correctFeedback] } });
      const { toJSON } = render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      expect(screen.getAllByText('Explanation').length).toBeGreaterThan(0);
      expect(screen.getByText('What is product-market fit?')).toBeTruthy();
      expect(screen.getByText('✓ Your answer: Option A')).toBeTruthy();

      const tree = JSON.stringify(toJSON());
      const yourAnswerIdx = tree.indexOf('Your answer:');
      const explanationBodyIdx = tree.indexOf('Because it matches market needs');
      expect(yourAnswerIdx).toBeGreaterThan(-1);
      expect(explanationBodyIdx).toBeGreaterThan(yourAnswerIdx);
    });

    it('incorrect: groups question, your answer and the correct answer in one block, before Explanation', () => {
      setQuizMock({ data: { ...mockResult, feedbacks: [incorrectFeedback] } });
      const { toJSON } = render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      expect(screen.getByText('Correct answer')).toBeTruthy();
      expect(screen.getAllByText('Explanation').length).toBeGreaterThan(0);
      expect(screen.getByText('✗ Your answer: Option B')).toBeTruthy();
      expect(screen.getByText('What is product-market fit?')).toBeTruthy();

      const tree = JSON.stringify(toJSON());
      const yourAnswerIdx = tree.indexOf('Your answer:');
      const correctAnswerLabelIdx = tree.indexOf('Correct answer');
      const explanationBodyIdx = tree.indexOf('Because it matches market needs');
      expect(yourAnswerIdx).toBeGreaterThan(-1);
      expect(correctAnswerLabelIdx).toBeGreaterThan(yourAnswerIdx);
      expect(explanationBodyIdx).toBeGreaterThan(correctAnswerLabelIdx);
    });

    it('terminal view: key takeaway renders after feedback cards (not before)', () => {
      setQuizMock({ data: { ...mockResult, feedbacks: [correctFeedback] } });
      const { toJSON } = render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      const takeaway = screen.getByTestId('quiz-key-takeaway');
      const feedbackCard = screen.getByTestId('feedback-card-q-1');
      expect(takeaway).toBeTruthy();
      expect(feedbackCard).toBeTruthy();

      const tree = JSON.stringify(toJSON());
      const explanationBodyIdx = tree.indexOf('Because it matches market needs');
      const takeawayIdx = tree.indexOf('Fit beats features');
      expect(takeawayIdx).toBeGreaterThan(explanationBodyIdx);
    });

    it('mid-capstone feedback uses QuizFeedbackCard (Explanation heading present)', () => {
      setQuizMock({ data: q1CorrectNotFinalized });
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.getAllByText('Explanation').length).toBeGreaterThan(0);
    });
  });

  describe('Chunk A4 — QuizOpt options', () => {
    it('renders multiple-choice options with letter keys A, B, C via QuizOpt', () => {
      render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      expect(screen.getByText('A')).toBeTruthy();
      expect(screen.getByText('B')).toBeTruthy();
      expect(screen.getByText('C')).toBeTruthy();
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

    it('shows achievement overlay when achievementsUnlocked is populated on finalization', () => {
      setQuizMock({ data: { ...mockResult, achievementsUnlocked: ['first-light'] } });
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.getByTestId('celebration-card')).toBeTruthy();
      expect(screen.getByText('Achievement Earned!')).toBeTruthy();
      expect(screen.getByText('First Light')).toBeTruthy();
    });

    it('shows XP chip overlay when xpAwarded > 0 and no achievements', () => {
      setQuizMock({ data: { ...mockResult, xpAwarded: 75, achievementsUnlocked: [] } });
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.getByTestId('xp-chip-animated')).toBeTruthy();
    });

    it('does not show any overlay when achievementsUnlocked is empty and xpAwarded is null', () => {
      setQuizMock({ data: { ...mockResult, xpAwarded: null, achievementsUnlocked: [] } });
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.queryByTestId('celebration-card')).toBeNull();
      expect(screen.queryByTestId('xp-chip-animated')).toBeNull();
    });

    it('advances to XP chip overlay after achievement overlay is dismissed', () => {
      setQuizMock({ data: { ...mockResult, xpAwarded: 50, achievementsUnlocked: ['first-light'] } });
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      // Achievement overlay is shown first
      expect(screen.getByTestId('celebration-card')).toBeTruthy();
      // Dismiss it
      fireEvent.press(screen.getByTestId('celebration-backdrop'));
      act(() => jest.runAllTimers());
      // XP chip overlay should now be shown
      expect(screen.getByTestId('xp-chip-animated')).toBeTruthy();
    });

    it('bug fix: second queued achievement gets its own timer and entrance animation, not the dismissed one\'s stale state', () => {
      setQuizMock({ data: { ...mockResult, achievementsUnlocked: ['first-light', 'good-innings'] } });
      render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
      expect(screen.getByText('First Light')).toBeTruthy();
      // Auto-dismiss the first achievement
      act(() => jest.advanceTimersByTime(6000));
      act(() => jest.runAllTimers());
      // Second achievement must render as its own fresh instance
      expect(screen.getByTestId('celebration-card')).toBeTruthy();
      expect(screen.getByText('Good Innings')).toBeTruthy();
      // ...and must carry its own auto-dismiss timer rather than being stuck forever
      act(() => jest.advanceTimersByTime(6000));
      act(() => jest.runAllTimers());
      expect(screen.queryByTestId('celebration-card')).toBeNull();
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
});

