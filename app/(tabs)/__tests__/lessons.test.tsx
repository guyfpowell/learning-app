import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import LessonsScreen from '../lessons';
import { useEnrollments, useSkipTopic, useSkipLevel } from '@/hooks/useTrack';
import { useProgress } from '@/hooks/useProgress';

const mockPush = jest.fn();
const mockSkipTopicMutate = jest.fn();
const mockSkipLevelMutate = jest.fn();

jest.mock('@/hooks/useTrack', () => ({
  useEnrollments: jest.fn(),
  useSkipTopic: jest.fn(),
  useSkipLevel: jest.fn(),
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

const mockNextLesson = {
  id: 'lesson-1',
  title: 'Introduction to Product Management',
  skillPath: { level: 'beginner' },
  topicName: 'Foundations',
  lessonIndex: 1,
  totalLessons: 10,
};

const mockLevels = [
  { level: 'beginner', levelNum: 1, totalLessons: 20, completedLessons: 15, percentComplete: 75 },
  { level: 'intermediate', levelNum: 2, totalLessons: 20, completedLessons: 5, percentComplete: 25 },
  { level: 'advanced', levelNum: 3, totalLessons: 10, completedLessons: 0, percentComplete: 0 },
];

const mockEnrollment = {
  id: 'enrollment-1',
  userId: 'user-1',
  skillId: 'skill-1',
  skill: { id: 'skill-1', name: 'Product Foundations', category: 'Product', description: '' },
  totalLessons: 50,
  completedLessons: 25,
  percentComplete: 50,
  nextLesson: mockNextLesson,
  levels: [],
  enrolledAt: new Date(),
  upgradeRequired: false,
  isActive: false,
  canSkipTopic: false,
  canSkipLevel: false,
};

const mockCompletedEnrollment = {
  ...mockEnrollment,
  id: 'enrollment-2',
  skillId: 'skill-2',
  skill: { ...mockEnrollment.skill, id: 'skill-2', name: 'Product Strategy' },
  completedLessons: 30,
  percentComplete: 100,
  nextLesson: null,
  isActive: false,
};

const mockProgress = {
  totalLessonsCompleted: 15,
  currentStreak: 5,
  averageScore: 82,
  lastLessonDate: null,
};

function setEnrollmentsMock(data?: unknown[]) {
  (useEnrollments as jest.Mock).mockReturnValue({ data });
}

function setProgressMock(data?: unknown) {
  (useProgress as jest.Mock).mockReturnValue({ data });
}

describe('LessonsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setEnrollmentsMock(undefined);
    setProgressMock(undefined);
    (useSkipTopic as jest.Mock).mockReturnValue({ mutate: mockSkipTopicMutate, isPending: false });
    (useSkipLevel as jest.Mock).mockReturnValue({ mutate: mockSkipLevelMutate, isPending: false });
  });

  it('renders without errors', () => {
    expect(() => render(<LessonsScreen />)).not.toThrow();
  });

  describe('streak card (ticket 019 ch5)', () => {
    it('shows streak card when currentStreak > 0', () => {
      setProgressMock(mockProgress);
      render(<LessonsScreen />);
      expect(screen.getByTestId('streak-card')).toBeTruthy();
    });

    it('shows streak day count in streak card', () => {
      setProgressMock(mockProgress);
      render(<LessonsScreen />);
      expect(screen.getByText('5 day streak')).toBeTruthy();
    });

    it('shows streak card at streak 0 with zero-state copy', () => {
      setProgressMock({ ...mockProgress, currentStreak: 0 });
      render(<LessonsScreen />);
      expect(screen.getByTestId('streak-card')).toBeTruthy();
      expect(screen.getByText('Complete a lesson today to start your streak')).toBeTruthy();
    });

    it('does not show streak card when progress is undefined', () => {
      render(<LessonsScreen />);
      expect(screen.queryByTestId('streak-card')).toBeNull();
    });
  });

  describe('streak banner (P5)', () => {
    it('shows streak banner when streak > 3', () => {
      setProgressMock({ ...mockProgress, currentStreak: 4 });
      render(<LessonsScreen />);
      expect(screen.getByTestId('streak-banner')).toBeTruthy();
      expect(screen.getByText(/keep it alive/)).toBeTruthy();
    });

    it('does not show streak banner when streak <= 3', () => {
      setProgressMock({ ...mockProgress, currentStreak: 3 });
      render(<LessonsScreen />);
      expect(screen.queryByTestId('streak-banner')).toBeNull();
    });
  });

  describe('enrollment cards (S2)', () => {
    it('shows active enrollment card with track name', () => {
      setEnrollmentsMock([mockEnrollment]);
      render(<LessonsScreen />);
      expect(screen.getAllByText('Product Foundations').length).toBeGreaterThanOrEqual(1);
    });

    it('shows % complete on enrollment card', () => {
      setEnrollmentsMock([mockEnrollment]);
      render(<LessonsScreen />);
      expect(screen.getByText('50% complete')).toBeTruthy();
    });

    it('shows lessons count on enrollment card', () => {
      setEnrollmentsMock([mockEnrollment]);
      render(<LessonsScreen />);
      expect(screen.getByText('25 of 50 lessons complete')).toBeTruthy();
    });

    it('shows motivation text on enrollment card', () => {
      setEnrollmentsMock([mockEnrollment]);
      render(<LessonsScreen />);
      expect(screen.getByText("You're 50% through Product Foundations — keep going!")).toBeTruthy();
    });

    it('shows next lesson title on enrollment card', () => {
      setEnrollmentsMock([mockEnrollment]);
      render(<LessonsScreen />);
      expect(screen.getByText('Introduction to Product Management')).toBeTruthy();
    });

    it('shows level badge from nextLesson on enrollment card', () => {
      setEnrollmentsMock([mockEnrollment]);
      render(<LessonsScreen />);
      expect(screen.getByText('BEGINNER')).toBeTruthy();
    });

    it('shows levelLabel in Badge when set on active track card', () => {
      const enrollment = {
        ...mockEnrollment,
        nextLesson: { ...mockNextLesson, skillPath: { level: 'beginner', levelLabel: 'Breaking into product' } },
      };
      setEnrollmentsMock([enrollment]);
      render(<LessonsScreen />);
      expect(screen.getByText('BREAKING INTO PRODUCT')).toBeTruthy();
      expect(screen.queryByText('BEGINNER')).toBeNull();
    });

    it('falls back to canonical level when levelLabel is null on active track card', () => {
      const enrollment = {
        ...mockEnrollment,
        nextLesson: { ...mockNextLesson, skillPath: { level: 'beginner', levelLabel: null } },
      };
      setEnrollmentsMock([enrollment]);
      render(<LessonsScreen />);
      expect(screen.getByText('BEGINNER')).toBeTruthy();
    });

    it('shows position label on enrollment card', () => {
      setEnrollmentsMock([mockEnrollment]);
      render(<LessonsScreen />);
      expect(screen.getByText('Foundations · Lesson 1 of 10')).toBeTruthy();
    });

    it('shows Start Lesson button in next-lesson card', () => {
      setEnrollmentsMock([mockEnrollment]);
      render(<LessonsScreen />);
      expect(screen.getByTestId('next-lesson-btn-skill-1')).toBeTruthy();
      expect(screen.getByText('START LESSON →')).toBeTruthy();
    });

    it('navigates to lesson detail when Start Lesson is pressed', () => {
      setEnrollmentsMock([mockEnrollment]);
      render(<LessonsScreen />);
      fireEvent.press(screen.getByTestId('next-lesson-btn-skill-1'));
      expect(mockPush).toHaveBeenCalledWith('/(tabs)/lesson/lesson-1');
    });

    it('shows "No lessons available yet." when nextLesson is null', () => {
      setEnrollmentsMock([{ ...mockEnrollment, nextLesson: null }]);
      render(<LessonsScreen />);
      expect(screen.getByText('No lessons available yet.')).toBeTruthy();
    });

    it('does not show Next Lesson button when nextLesson is null', () => {
      setEnrollmentsMock([{ ...mockEnrollment, nextLesson: null }]);
      render(<LessonsScreen />);
      expect(screen.queryByTestId('next-lesson-btn-skill-1')).toBeNull();
    });

    it('shows completed enrollment card with track name and Completed badge', () => {
      setEnrollmentsMock([mockCompletedEnrollment]);
      render(<LessonsScreen />);
      expect(screen.getByText('Product Strategy')).toBeTruthy();
      expect(screen.getByText('COMPLETED')).toBeTruthy();
    });

    it('does not show active enrollment section when no active enrollments', () => {
      setEnrollmentsMock([mockCompletedEnrollment]);
      render(<LessonsScreen />);
      expect(screen.queryByText('Active Tracks')).toBeNull();
    });

    describe('TrackMap (P5)', () => {
      it('renders track-map-level nodes when levels are provided', () => {
        setEnrollmentsMock([{ ...mockEnrollment, levels: mockLevels }]);
        render(<LessonsScreen />);
        expect(screen.getAllByTestId('track-map-level')).toHaveLength(3);
      });

      it('shows capitalised level labels in TrackMap', () => {
        setEnrollmentsMock([{ ...mockEnrollment, levels: mockLevels }]);
        render(<LessonsScreen />);
        expect(screen.getByText('Beginner')).toBeTruthy();
        expect(screen.getByText('Intermediate')).toBeTruthy();
        expect(screen.getByText('Advanced')).toBeTruthy();
      });

      it('shows completed/total counts for each level', () => {
        setEnrollmentsMock([{ ...mockEnrollment, levels: mockLevels }]);
        render(<LessonsScreen />);
        expect(screen.getByText('15/20')).toBeTruthy();
        expect(screen.getByText('5/20')).toBeTruthy();
        expect(screen.getByText('0/10')).toBeTruthy();
      });

      it('does not render TrackMap when levels is empty', () => {
        setEnrollmentsMock([mockEnrollment]);
        render(<LessonsScreen />);
        expect(screen.queryByTestId('track-map-level')).toBeNull();
      });
    });
  });

  describe('Chunk 1 — Next Lesson card', () => {
    it('renders a separate next-lesson card before the enrollment card', () => {
      setEnrollmentsMock([mockEnrollment]);
      render(<LessonsScreen />);
      expect(screen.getByTestId('next-lesson-card-skill-1')).toBeTruthy();
      expect(screen.getByTestId('enrollment-card-skill-1')).toBeTruthy();
    });

    it('shows lesson summary in the next-lesson card when present', () => {
      setEnrollmentsMock([{
        ...mockEnrollment,
        nextLesson: { ...mockNextLesson, summary: 'Learn the basics of PM.' },
      }]);
      render(<LessonsScreen />);
      expect(screen.getByText('Learn the basics of PM.')).toBeTruthy();
    });

    it('does not render next-lesson card when nextLesson is null', () => {
      setEnrollmentsMock([{ ...mockEnrollment, nextLesson: null }]);
      render(<LessonsScreen />);
      expect(screen.queryByTestId('next-lesson-card-skill-1')).toBeNull();
    });

    it('shows track name in the next-lesson card', () => {
      setEnrollmentsMock([mockEnrollment]);
      render(<LessonsScreen />);
      expect(screen.getAllByText('Product Foundations').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('skip topic/level (ticket 057)', () => {
    it('shows Skip Topic button when canSkipTopic is true', () => {
      setEnrollmentsMock([{ ...mockEnrollment, canSkipTopic: true }]);
      render(<LessonsScreen />);
      expect(screen.getByTestId('skip-topic-btn-skill-1')).toBeTruthy();
    });

    it('does not show Skip Topic button when canSkipTopic is false', () => {
      setEnrollmentsMock([{ ...mockEnrollment, canSkipTopic: false }]);
      render(<LessonsScreen />);
      expect(screen.queryByTestId('skip-topic-btn-skill-1')).toBeNull();
    });

    it('shows Skip Level button when canSkipLevel is true', () => {
      setEnrollmentsMock([{ ...mockEnrollment, canSkipLevel: true }]);
      render(<LessonsScreen />);
      expect(screen.getByTestId('skip-level-btn-skill-1')).toBeTruthy();
    });

    it('does not show Skip Level button when canSkipLevel is false', () => {
      setEnrollmentsMock([{ ...mockEnrollment, canSkipLevel: false }]);
      render(<LessonsScreen />);
      expect(screen.queryByTestId('skip-level-btn-skill-1')).toBeNull();
    });

    it('calls skipTopic mutation with skillId when Skip Topic is pressed', () => {
      setEnrollmentsMock([{ ...mockEnrollment, canSkipTopic: true }]);
      render(<LessonsScreen />);
      fireEvent.press(screen.getByTestId('skip-topic-btn-skill-1'));
      expect(mockSkipTopicMutate).toHaveBeenCalledWith('skill-1');
    });

    it('calls skipLevel mutation with skillId when Skip Level is pressed', () => {
      setEnrollmentsMock([{ ...mockEnrollment, canSkipLevel: true }]);
      render(<LessonsScreen />);
      fireEvent.press(screen.getByTestId('skip-level-btn-skill-1'));
      expect(mockSkipLevelMutate).toHaveBeenCalledWith('skill-1');
    });

    it('disables Skip Topic button while skip-topic mutation is pending', () => {
      (useSkipTopic as jest.Mock).mockReturnValue({ mutate: mockSkipTopicMutate, isPending: true });
      setEnrollmentsMock([{ ...mockEnrollment, canSkipTopic: true }]);
      render(<LessonsScreen />);
      expect(screen.getByTestId('skip-topic-btn-skill-1').props.accessibilityState?.disabled).toBe(true);
    });

    it('disables Skip Level button while skip-level mutation is pending', () => {
      (useSkipLevel as jest.Mock).mockReturnValue({ mutate: mockSkipLevelMutate, isPending: true });
      setEnrollmentsMock([{ ...mockEnrollment, canSkipLevel: true }]);
      render(<LessonsScreen />);
      expect(screen.getByTestId('skip-level-btn-skill-1').props.accessibilityState?.disabled).toBe(true);
    });

    it('does not show either skip button when both flags are false', () => {
      setEnrollmentsMock([{ ...mockEnrollment, canSkipTopic: false, canSkipLevel: false }]);
      render(<LessonsScreen />);
      expect(screen.queryByTestId('skip-topic-btn-skill-1')).toBeNull();
      expect(screen.queryByTestId('skip-level-btn-skill-1')).toBeNull();
    });
  });

  describe('empty state (ticket 019 ch5)', () => {
    it('shows Start Learning card when no enrollments', () => {
      setEnrollmentsMock([]);
      render(<LessonsScreen />);
      expect(screen.getByTestId('start-learning-card')).toBeTruthy();
    });

    it('does not show Start Learning card when enrollments exist', () => {
      setEnrollmentsMock([mockEnrollment]);
      render(<LessonsScreen />);
      expect(screen.queryByTestId('start-learning-card')).toBeNull();
    });

    it('does not show Start Learning card when enrollments are loading', () => {
      setEnrollmentsMock(undefined);
      render(<LessonsScreen />);
      expect(screen.queryByTestId('start-learning-card')).toBeNull();
    });

    it('navigates to tracks tab when Browse Tracks button is pressed', () => {
      setEnrollmentsMock([]);
      render(<LessonsScreen />);
      fireEvent.press(screen.getByTestId('browse-tracks-btn'));
      expect(mockPush).toHaveBeenCalledWith('/(tabs)/tracks');
    });
  });

  describe('active track prominence (ticket 044)', () => {
    const secondEnrollment = {
      ...mockEnrollment,
      id: 'enrollment-3',
      skillId: 'skill-3',
      skill: { id: 'skill-3', name: 'Business Strategy', category: 'Business', description: '' },
      nextLesson: { ...mockNextLesson, id: 'lesson-3', title: 'Business Foundations' },
      isActive: true,
    };

    it('active track next-lesson card appears before non-active tracks', () => {
      // secondEnrollment is active; mockEnrollment is not active
      setEnrollmentsMock([mockEnrollment, secondEnrollment]);
      render(<LessonsScreen />);
      const activeCard = screen.getByTestId('next-lesson-card-skill-3');
      const otherCard  = screen.getByTestId('next-lesson-card-skill-1');
      // active card should appear earlier in the stringified JSON tree
      const json = JSON.stringify(screen.toJSON());
      const activeIndex = json.indexOf('next-lesson-card-skill-3');
      const otherIndex  = json.indexOf('next-lesson-card-skill-1');
      expect(activeCard).toBeTruthy();
      expect(otherCard).toBeTruthy();
      expect(activeIndex).toBeGreaterThan(-1);
      expect(activeIndex).toBeLessThan(otherIndex);
    });

    it('shows ACTIVE badge on the active track next-lesson card', () => {
      setEnrollmentsMock([{ ...mockEnrollment, isActive: true }]);
      render(<LessonsScreen />);
      expect(screen.getByTestId('active-track-label-skill-1')).toBeTruthy();
    });

    it('does not show ACTIVE badge on non-active track next-lesson card', () => {
      setEnrollmentsMock([mockEnrollment]);
      render(<LessonsScreen />);
      expect(screen.queryByTestId('active-track-label-skill-1')).toBeNull();
    });
  });
});
