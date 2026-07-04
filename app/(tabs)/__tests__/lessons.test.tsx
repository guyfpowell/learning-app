import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import LessonsScreen from '../lessons';
import { useTodayLesson, useSaveLesson, useUnsaveLesson } from '@/hooks/useLesson';

jest.mock('@/hooks/useLesson', () => ({
  useTodayLesson: jest.fn(),
  useSaveLesson: jest.fn(),
  useUnsaveLesson: jest.fn(),
}));

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

const mockSaveMutate = jest.fn();
const mockUnsaveMutate = jest.fn();

describe('LessonsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSaveLesson as jest.Mock).mockReturnValue({ mutate: mockSaveMutate });
    (useUnsaveLesson as jest.Mock).mockReturnValue({ mutate: mockUnsaveMutate });
  });

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

  describe('bookmark (ticket 017 chunk 3)', () => {
    it('shows unsaved state when lesson.isSaved is false', () => {
      setMock({ data: { ...mockLesson, isSaved: false } });
      render(<LessonsScreen />);
      expect(screen.getByLabelText('Save lesson')).toBeTruthy();
    });

    it('shows saved state when lesson.isSaved is true', () => {
      setMock({ data: { ...mockLesson, isSaved: true } });
      render(<LessonsScreen />);
      expect(screen.getByLabelText('Remove from saved lessons')).toBeTruthy();
    });

    it('calls useSaveLesson.mutate with the lesson id when toggled on', () => {
      setMock({ data: { ...mockLesson, isSaved: false } });
      render(<LessonsScreen />);
      fireEvent.press(screen.getByLabelText('Save lesson'));
      expect(mockSaveMutate).toHaveBeenCalledWith('lesson-1', expect.anything());
    });

    it('calls useUnsaveLesson.mutate with the lesson id when toggled off', () => {
      setMock({ data: { ...mockLesson, isSaved: true } });
      render(<LessonsScreen />);
      fireEvent.press(screen.getByLabelText('Remove from saved lessons'));
      expect(mockUnsaveMutate).toHaveBeenCalledWith('lesson-1', expect.anything());
    });
  });
});
