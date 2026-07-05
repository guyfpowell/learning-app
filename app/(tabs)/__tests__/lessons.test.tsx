import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import LessonsScreen from '../lessons';
import { useTodayLesson, useSaveLesson, useUnsaveLesson } from '@/hooks/useLesson';
import { useEnrollments } from '@/hooks/useTrack';
import { useProgress } from '@/hooks/useProgress';

const mockPush = jest.fn();

jest.mock('@/hooks/useLesson', () => ({
  useTodayLesson: jest.fn(),
  useSaveLesson: jest.fn(),
  useUnsaveLesson: jest.fn(),
}));

jest.mock('@/hooks/useTrack', () => ({
  useEnrollments: jest.fn(),
}));

jest.mock('@/hooks/useProgress', () => ({
  useProgress: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
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

const mockEnrollment = {
  id: 'enrollment-1',
  userId: 'user-1',
  skillId: 'skill-1',
  skill: { id: 'skill-1', name: 'Product Foundations', category: 'Product', description: '' },
  totalLessons: 50,
  completedLessons: 25,
  percentComplete: 50,
  nextLesson: null,
  levels: [],
  enrolledAt: new Date(),
};

const mockCompletedEnrollment = {
  ...mockEnrollment,
  id: 'enrollment-2',
  skillId: 'skill-2',
  skill: { ...mockEnrollment.skill, id: 'skill-2', name: 'Product Strategy' },
  completedLessons: 30,
  percentComplete: 100,
};

const mockProgress = {
  totalLessonsCompleted: 15,
  currentStreak: 5,
  averageScore: 82,
  lastLessonDate: null,
};

function setMock(overrides: Record<string, unknown> = {}) {
  (useTodayLesson as jest.Mock).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    ...overrides,
  });
}

function setEnrollmentsMock(data?: unknown[]) {
  (useEnrollments as jest.Mock).mockReturnValue({ data });
}

function setProgressMock(data?: unknown) {
  (useProgress as jest.Mock).mockReturnValue({ data });
}

const mockSaveMutate = jest.fn();
const mockUnsaveMutate = jest.fn();

describe('LessonsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSaveLesson as jest.Mock).mockReturnValue({ mutate: mockSaveMutate });
    (useUnsaveLesson as jest.Mock).mockReturnValue({ mutate: mockUnsaveMutate });
    setEnrollmentsMock(undefined);
    setProgressMock(undefined);
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

  describe('Complete Lesson → Take Quiz flow (ticket 019 ch2)', () => {
    it('shows Complete Lesson button initially', () => {
      setMock({ data: mockLesson });
      render(<LessonsScreen />);
      expect(screen.getByText('COMPLETE LESSON')).toBeTruthy();
    });

    it('does not show Take Quiz button before completing', () => {
      setMock({ data: mockLesson });
      render(<LessonsScreen />);
      expect(screen.queryByText('TAKE QUIZ')).toBeNull();
    });

    it('hides Complete Lesson and shows Take Quiz after pressing Complete Lesson', () => {
      setMock({ data: mockLesson });
      render(<LessonsScreen />);
      fireEvent.press(screen.getByText('COMPLETE LESSON'));
      expect(screen.queryByText('COMPLETE LESSON')).toBeNull();
      expect(screen.getByText('TAKE QUIZ')).toBeTruthy();
    });

    it('shows key takeaway callout after completing when keyTakeaway is present', () => {
      setMock({ data: { ...mockLesson, keyTakeaway: 'The key insight here.' } });
      render(<LessonsScreen />);
      expect(screen.queryByTestId('key-takeaway')).toBeNull();
      fireEvent.press(screen.getByText('COMPLETE LESSON'));
      expect(screen.getByTestId('key-takeaway')).toBeTruthy();
      expect(screen.getByText('The key insight here.')).toBeTruthy();
    });

    it('does not show key takeaway when keyTakeaway is absent after completing', () => {
      setMock({ data: mockLesson });
      render(<LessonsScreen />);
      fireEvent.press(screen.getByText('COMPLETE LESSON'));
      expect(screen.queryByTestId('key-takeaway')).toBeNull();
    });

    it('opens QuizModal when Take Quiz is pressed after completing', () => {
      setMock({ data: mockLesson });
      render(<LessonsScreen />);
      expect(screen.queryByTestId('quiz-modal')).toBeNull();
      fireEvent.press(screen.getByText('COMPLETE LESSON'));
      fireEvent.press(screen.getByText('TAKE QUIZ'));
      expect(screen.getByTestId('quiz-modal')).toBeTruthy();
    });
  });

  describe('lesson content (ticket 019 ch2)', () => {
    it('shows lesson summary when present', () => {
      setMock({ data: { ...mockLesson, summary: 'A quick intro to PM.' } });
      render(<LessonsScreen />);
      expect(screen.getByTestId('lesson-summary')).toBeTruthy();
      expect(screen.getByText('A quick intro to PM.')).toBeTruthy();
    });

    it('does not show summary element when summary is absent', () => {
      setMock({ data: mockLesson });
      render(<LessonsScreen />);
      expect(screen.queryByTestId('lesson-summary')).toBeNull();
    });

    it('renders parsed lesson introduction from content JSON', () => {
      setMock({ data: mockLesson });
      render(<LessonsScreen />);
      expect(screen.getByTestId('lesson-introduction')).toBeTruthy();
      expect(screen.getByText('Hello')).toBeTruthy();
    });

    it('renders key points from content JSON', () => {
      const contentWithPoints = JSON.stringify({
        introduction: 'Intro text',
        keyPoints: ['Point one', 'Point two'],
      });
      setMock({ data: { ...mockLesson, content: contentWithPoints } });
      render(<LessonsScreen />);
      expect(screen.getByText('• Point one')).toBeTruthy();
      expect(screen.getByText('• Point two')).toBeTruthy();
    });

    it('renders example text from content JSON when present', () => {
      const contentWithExample = JSON.stringify({
        introduction: 'Intro',
        example: 'Here is an example.',
      });
      setMock({ data: { ...mockLesson, content: contentWithExample } });
      render(<LessonsScreen />);
      expect(screen.getByText('Here is an example.')).toBeTruthy();
    });

    it('shows media image when mediaUrl is present', () => {
      setMock({ data: { ...mockLesson, mediaUrl: 'https://example.com/img.png' } });
      render(<LessonsScreen />);
      expect(screen.getByTestId('lesson-media')).toBeTruthy();
    });

    it('does not show media image when mediaUrl is absent', () => {
      setMock({ data: mockLesson });
      render(<LessonsScreen />);
      expect(screen.queryByTestId('lesson-media')).toBeNull();
    });
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

  describe('streak card (ticket 019 ch5)', () => {
    it('shows streak card when currentStreak > 0', () => {
      setMock();
      setProgressMock(mockProgress);
      render(<LessonsScreen />);
      expect(screen.getByTestId('streak-card')).toBeTruthy();
    });

    it('shows streak day count in streak card', () => {
      setMock();
      setProgressMock(mockProgress);
      render(<LessonsScreen />);
      expect(screen.getByText('5 day streak')).toBeTruthy();
    });

    it('does not show streak card when streak is 0', () => {
      setMock();
      setProgressMock({ ...mockProgress, currentStreak: 0 });
      render(<LessonsScreen />);
      expect(screen.queryByTestId('streak-card')).toBeNull();
    });

    it('does not show streak card when progress is undefined', () => {
      setMock();
      setProgressMock(undefined);
      render(<LessonsScreen />);
      expect(screen.queryByTestId('streak-card')).toBeNull();
    });
  });

  describe('enrollment cards (ticket 019 ch5)', () => {
    it('shows active enrollment card with track name', () => {
      setMock();
      setProgressMock(undefined);
      setEnrollmentsMock([mockEnrollment]);
      render(<LessonsScreen />);
      expect(screen.getByText('Product Foundations')).toBeTruthy();
    });

    it('shows % complete on enrollment card', () => {
      setMock();
      setProgressMock(undefined);
      setEnrollmentsMock([mockEnrollment]);
      render(<LessonsScreen />);
      expect(screen.getByText('50% complete')).toBeTruthy();
    });

    it('shows lessons count on enrollment card', () => {
      setMock();
      setProgressMock(undefined);
      setEnrollmentsMock([mockEnrollment]);
      render(<LessonsScreen />);
      expect(screen.getByText('25 of 50 lessons complete')).toBeTruthy();
    });

    it('shows motivation text on enrollment card', () => {
      setMock();
      setProgressMock(undefined);
      setEnrollmentsMock([mockEnrollment]);
      render(<LessonsScreen />);
      expect(screen.getByText("You're 50% through Product Foundations — keep going!")).toBeTruthy();
    });

    it('shows Continue button on active enrollment card', () => {
      setMock();
      setProgressMock(undefined);
      setEnrollmentsMock([mockEnrollment]);
      render(<LessonsScreen />);
      expect(screen.getByText('CONTINUE')).toBeTruthy();
    });

    it('shows completed enrollment card with track name and Completed badge', () => {
      setMock();
      setProgressMock(undefined);
      setEnrollmentsMock([mockCompletedEnrollment]);
      render(<LessonsScreen />);
      expect(screen.getByText('Product Strategy')).toBeTruthy();
      expect(screen.getByText('COMPLETED')).toBeTruthy();
    });

    it('does not show active enrollment section when no active enrollments', () => {
      setMock();
      setProgressMock(undefined);
      setEnrollmentsMock([mockCompletedEnrollment]);
      render(<LessonsScreen />);
      expect(screen.queryByText('Active Tracks')).toBeNull();
    });
  });

  describe('empty state (ticket 019 ch5)', () => {
    it('shows Start Learning card when no enrollments', () => {
      setMock();
      setProgressMock(undefined);
      setEnrollmentsMock([]);
      render(<LessonsScreen />);
      expect(screen.getByTestId('start-learning-card')).toBeTruthy();
    });

    it('does not show Start Learning card when enrollments exist', () => {
      setMock();
      setProgressMock(undefined);
      setEnrollmentsMock([mockEnrollment]);
      render(<LessonsScreen />);
      expect(screen.queryByTestId('start-learning-card')).toBeNull();
    });

    it('does not show Start Learning card when enrollments are loading', () => {
      setMock();
      setProgressMock(undefined);
      setEnrollmentsMock(undefined);
      render(<LessonsScreen />);
      expect(screen.queryByTestId('start-learning-card')).toBeNull();
    });

    it('navigates to tracks tab when Browse Tracks button is pressed', () => {
      setMock();
      setProgressMock(undefined);
      setEnrollmentsMock([]);
      render(<LessonsScreen />);
      fireEvent.press(screen.getByTestId('browse-tracks-btn'));
      expect(mockPush).toHaveBeenCalledWith('/(tabs)/tracks');
    });
  });
});
