import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
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
  day: 1,
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
    expect(screen.getByText('Quiz Complete!')).toBeTruthy();
    expect(screen.getByText('90%')).toBeTruthy();
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
      expect(screen.getByText('Quiz Complete!')).toBeTruthy();
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
      expect(screen.getByText('Quiz Complete!')).toBeTruthy();
      expect(screen.queryByText('Already Completed')).toBeNull();
    });
  });

  describe('quiz retake (ticket 017 goal 4)', () => {
    it('shows an Incorrect screen with keyTakeaway and Try again / Next lesson when a first attempt is wrong', () => {
      setQuizMock({ data: wrongPendingResult });
      render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);

      expect(screen.getByText('Incorrect')).toBeTruthy();
      expect(screen.getByText('Fit beats features.')).toBeTruthy();
      expect(screen.getByText('TRY AGAIN')).toBeTruthy();
      expect(screen.getByText('NEXT LESSON')).toBeTruthy();
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

    it('Next lesson (skip retake) submits with skipRetake: true', () => {
      setQuizMock({ data: wrongPendingResult });
      render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);

      fireEvent.press(screen.getByText('NEXT LESSON'));

      expect(mockMutate).toHaveBeenCalledWith(
        { lessonId: 'lesson-1', answers: {}, skipRetake: true },
        expect.anything()
      );
    });

    it('shows the full results view (not the retake offer) once retakeAvailable is false', () => {
      setQuizMock({ data: { ...mockResult, correct: false, retakeAvailable: false } });
      render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);

      expect(screen.getByText('Quiz Complete!')).toBeTruthy();
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
});
