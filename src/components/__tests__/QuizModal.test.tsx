import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QuizModal } from '../QuizModal';
import { useSubmitQuiz } from '@/hooks/useQuiz';

jest.mock('@/hooks/useQuiz', () => ({ useSubmitQuiz: jest.fn() }));

const mockMutate = jest.fn();

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
  durationMinutes: 5,
  difficulty: 'beginner' as const,
  quizzes: [mockQuiz1, mockQuiz2],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockLessonNoQuiz = { ...mockLesson, quizzes: [] };

const mockResult = {
  score: 100,
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
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('shows score fraction in results', () => {
    setQuizMock({ data: mockResult });
    render(<QuizModal visible={true} lesson={mockLesson} onClose={onClose} />);
    expect(screen.getByText('2 of 2 correct')).toBeTruthy();
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
});
