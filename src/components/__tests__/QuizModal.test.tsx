import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QuizModal } from '../QuizModal';
import { useSubmitQuiz } from '@/hooks/useQuiz';
import { useSaveLesson, useUnsaveLesson } from '@/hooks/useLesson';

jest.mock('@/hooks/useQuiz', () => ({ useSubmitQuiz: jest.fn() }));
jest.mock('@/hooks/useLesson', () => ({
  useSaveLesson: jest.fn(),
  useUnsaveLesson: jest.fn(),
}));

const mockMutate = jest.fn();
const mockSaveMutate = jest.fn();
const mockUnsaveMutate = jest.fn();

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

const wrongPendingResult = {
  score: 0,
  correct: false,
  retakeAvailable: true,
  feedbacks: [
    { quizId: 'q-1', question: mockQuiz1.question, userAnswer: 'Option B', correctAnswer: null, isCorrect: false, explanation: 'x' },
  ],
  lesson: singleQuizLesson,
  coaching: null,
};

const mockResult = {
  score: 100,
  correct: true,
  retakeAvailable: false,
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

describe('QuizModal', () => {
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    setQuizMock();
    (useSaveLesson as jest.Mock).mockReturnValue({ mutate: mockSaveMutate });
    (useUnsaveLesson as jest.Mock).mockReturnValue({ mutate: mockUnsaveMutate });
  });

  it('does not render content when visible=false', () => {
    render(<QuizModal visible={false} lesson={mockLesson} onClose={onClose} />);
    expect(screen.queryByText('What is product-market fit?')).toBeNull();
  });

  it('renders the first question when visible', () => {
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.getByText('What is product-market fit?')).toBeTruthy();
  });

  it('shows question progress indicator', () => {
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.getByText('Question 1 of 2')).toBeTruthy();
  });

  it('renders multiple-choice options', () => {
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.getByText('Option A')).toBeTruthy();
    expect(screen.getByText('Option B')).toBeTruthy();
    expect(screen.getByText('Option C')).toBeTruthy();
  });

  it('shows "Next" button when not on last question', () => {
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.getByText('NEXT')).toBeTruthy();
  });

  it('advances to next question on Next press after selecting an answer', () => {
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    fireEvent.press(screen.getByText('Option A'));
    fireEvent.press(screen.getByText('NEXT'));
    expect(screen.getByText('What does MVP stand for?')).toBeTruthy();
    expect(screen.getByText('Question 2 of 2')).toBeTruthy();
  });

  it('shows "Submit" on the last question', () => {
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    fireEvent.press(screen.getByText('Option A'));
    fireEvent.press(screen.getByText('NEXT'));
    expect(screen.getByText('SUBMIT')).toBeTruthy();
  });

  it('calls mutate with lessonId and collected answers on Submit', () => {
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    fireEvent.press(screen.getByText('Option A'));
    fireEvent.press(screen.getByText('NEXT'));
    fireEvent.press(screen.getByText('Minimum Viable Product'));
    fireEvent.press(screen.getByText('SUBMIT'));
    expect(mockMutate).toHaveBeenCalledWith({
      lessonId: 'lesson-1',
      answers: { 'q-1': 'Option A', 'q-2': 'Minimum Viable Product' },
    });
  });

  it('shows spinner on Submit button while submitting', () => {
    setQuizMock({ isPending: true });
    // Single-quiz lesson so first question IS the last — no navigation needed
    const singleQuizLesson = { ...mockLesson, quizzes: [mockQuiz1] };
    render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
    // Button is in loading state — "SUBMIT" text is replaced by ActivityIndicator
    expect(screen.queryByText('SUBMIT')).toBeNull();
    const { ActivityIndicator } = require('react-native');
    expect(screen.UNSAFE_queryByType(ActivityIndicator)).toBeTruthy();
  });

  it('shows results view after successful submission', () => {
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

  it('shows error message when submission fails', () => {
    setQuizMock({ isError: true });
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    // Navigate to last question
    fireEvent.press(screen.getByText('Option A'));
    fireEvent.press(screen.getByText('NEXT'));
    expect(screen.getByText('Submission failed. Please try again.')).toBeTruthy();
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

  it('calls onClose when Done is pressed in results', () => {
    setQuizMock({ data: mockResult });
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    fireEvent.press(screen.getByText('DONE'));
    expect(onClose).toHaveBeenCalled();
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
      // First render already-wrong so the modal reflects "just answered Option B, got it wrong".
      setQuizMock({ data: undefined });
      const { rerender } = render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      fireEvent.press(screen.getByText('Option B'));
      fireEvent.press(screen.getByText('SUBMIT'));
      expect(mockMutate).toHaveBeenCalledWith({ lessonId: 'lesson-1', answers: { 'q-1': 'Option B' } });

      // Now the mutation resolves wrong-with-retake; re-render with that data.
      setQuizMock({ data: wrongPendingResult });
      rerender(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      fireEvent.press(screen.getByText('TRY AGAIN'));

      // Back on the quiz view — the previously wrong option is disabled, pick a new one.
      setQuizMock({ data: undefined });
      rerender(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      fireEvent.press(screen.getByText('Option A'));
      fireEvent.press(screen.getByText('SUBMIT'));

      expect(mockMutate).toHaveBeenLastCalledWith({
        lessonId: 'lesson-1',
        answers: { 'q-1': 'Option A' },
        isRetake: true,
      });
    });

    it('Next lesson (skip retake) submits with skipRetake: true', () => {
      setQuizMock({ data: wrongPendingResult });
      render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);

      fireEvent.press(screen.getByText('NEXT LESSON'));

      expect(mockMutate).toHaveBeenCalledWith({
        lessonId: 'lesson-1',
        answers: {},
        skipRetake: true,
      });
    });

    it('shows the full results view (not the retake offer) once retakeAvailable is false', () => {
      setQuizMock({ data: { ...mockResult, correct: false, retakeAvailable: false } });
      render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);

      expect(screen.getByText('Quiz Complete!')).toBeTruthy();
      expect(screen.queryByText('Try again')).toBeNull();
    });

    it('shows a flat dash (not up/down) once a retake was used, regardless of the average numbers', () => {
      // Select the wrong option and submit, same as the real flow, so the modal
      // knows which answer to disable on retake.
      setQuizMock({ data: undefined });
      const { rerender } = render(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      fireEvent.press(screen.getByText('Option B'));
      fireEvent.press(screen.getByText('SUBMIT'));

      // Wrong first attempt, retake offered.
      setQuizMock({ data: wrongPendingResult });
      rerender(<QuizModal visible={true} lesson={singleQuizLesson} onClose={onClose} />);
      fireEvent.press(screen.getByText('TRY AGAIN'));

      // Retake resolves correct — trackAverage/previousAverage are equal here on purpose,
      // which would render an up arrow on a non-retake result but must render '=' instead.
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
  });
});
