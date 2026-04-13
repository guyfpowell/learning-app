import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import LessonsScreen from '../lessons';
import { useTodayLesson } from '@/hooks/useLesson';

jest.mock('@/hooks/useLesson', () => ({ useTodayLesson: jest.fn() }));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Prevent QuizModal from rendering its full internals in screen tests
jest.mock('@/components/QuizModal', () => ({
  QuizModal: ({ visible }: { visible: boolean }) =>
    visible ? require('react').createElement(
      require('react-native').View,
      { testID: 'quiz-modal' }
    ) : null,
}));

const mockLesson = {
  id: 'lesson-1',
  skillPathId: 'sp-1',
  day: 1,
  title: 'Introduction to Product Management',
  content: '{"introduction":"Hello"}',
  durationMinutes: 5,
  difficulty: 'beginner' as const,
  quizzes: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

function setMock(overrides: Record<string, unknown> = {}) {
  (useTodayLesson as jest.Mock).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    ...overrides,
  });
}

describe('LessonsScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders without errors', () => {
    setMock();
    expect(() => render(<LessonsScreen />)).not.toThrow();
  });

  it('shows "Today\'s Lesson" heading', () => {
    setMock();
    render(<LessonsScreen />);
    expect(screen.getByText("Today's Lesson")).toBeTruthy();
  });

  it('shows lesson title when data is loaded', () => {
    setMock({ data: mockLesson });
    render(<LessonsScreen />);
    expect(screen.getByText('Introduction to Product Management')).toBeTruthy();
  });

  it('shows lesson duration', () => {
    setMock({ data: mockLesson });
    render(<LessonsScreen />);
    expect(screen.getByText('5 min')).toBeTruthy();
  });

  it('shows difficulty badge', () => {
    setMock({ data: mockLesson });
    render(<LessonsScreen />);
    expect(screen.getByText('BEGINNER')).toBeTruthy();
  });

  it('shows Take Quiz button', () => {
    setMock({ data: mockLesson });
    render(<LessonsScreen />);
    expect(screen.getByText('TAKE QUIZ')).toBeTruthy();
  });

  it('shows error message when fetch fails', () => {
    setMock({ isError: true });
    render(<LessonsScreen />);
    expect(screen.getByText('Unable to load lesson. Please try again.')).toBeTruthy();
  });

  it('shows no lesson message when data is null', () => {
    setMock({ data: null });
    render(<LessonsScreen />);
    expect(screen.getByText('No lesson scheduled for today.')).toBeTruthy();
  });

  it('does not show lesson card while loading', () => {
    setMock({ isLoading: true });
    render(<LessonsScreen />);
    expect(screen.queryByText('Introduction to Product Management')).toBeNull();
  });

  it('opens QuizModal when Take Quiz is pressed', () => {
    setMock({ data: mockLesson });
    render(<LessonsScreen />);
    expect(screen.queryByTestId('quiz-modal')).toBeNull();
    fireEvent.press(screen.getByText('TAKE QUIZ'));
    expect(screen.getByTestId('quiz-modal')).toBeTruthy();
  });
});
