import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import LessonsScreen from '../lessons';
import { usePaths, useSkipLesson, useSkipTopic, useSkipLevel } from '@/hooks/useTrack';
import { useProgress } from '@/hooks/useProgress';

jest.mock('@/components/ui/Ring', () => ({
  Ring: (props: { value: number; label?: string }) => {
    const React = require('react');
    const { View, Text } = require('react-native');
    return React.createElement(
      View, { testID: 'streak-ring' },
      React.createElement(Text, { testID: 'streak-ring-label' }, props.label)
    );
  },
}));

const mockPush = jest.fn();
const mockSkipLessonMutate = jest.fn();
const mockSkipTopicMutate = jest.fn();
const mockSkipLevelMutate = jest.fn();

jest.mock('@/hooks/useTrack', () => ({
  usePaths: jest.fn(),
  useSkipLesson: jest.fn(),
  useSkipTopic: jest.fn(),
  useSkipLevel: jest.fn(),
}));

jest.mock('@/hooks/useProgress', () => ({
  useProgress: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

let capturedEdges: string[] | undefined;
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, edges }: { children: React.ReactNode; edges?: string[] }) => {
    capturedEdges = edges;
    return <>{children}</>;
  },
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
  kind: 'track' as const,
  id: 'skill-1',
  name: 'Product Foundations',
  skill: { id: 'skill-1', name: 'Product Foundations', category: 'Product', description: '' },
  totalLessons: 50,
  completedLessons: 25,
  percentComplete: 50,
  nextLesson: mockNextLesson,
  levels: [],
  enrolledAt: new Date().toISOString(),
  completedAt: null,
  upgradeRequired: false,
  isActive: false,
  canSkipLesson: false,
  canSkipTopic: false,
  canSkipLevel: false,
  averageScore: null,
  capstoneScore: null,
};

const mockCompletedEnrollment = {
  ...mockEnrollment,
  id: 'skill-2',
  name: 'Product Strategy',
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

// One array now carries both kinds (ADR-009 C2), so the two old setters write into
// one list rather than two hooks. Kept as separate helpers so the existing tests read
// unchanged — what they assert about each kind is still exactly what they asserted.
let mockTrackPaths: unknown[] | undefined;
let mockCustomPaths: unknown[] | undefined;

function applyPathsMock() {
  const data = mockTrackPaths === undefined && mockCustomPaths === undefined
    ? undefined
    : [...(mockCustomPaths ?? []), ...(mockTrackPaths ?? [])];
  (usePaths as jest.Mock).mockReturnValue({ data });
}

function setEnrollmentsMock(data?: unknown[]) {
  mockTrackPaths = data;
  applyPathsMock();
}

function setCustomPlansMock(data?: unknown[]) {
  mockCustomPaths = data;
  applyPathsMock();
}

function setProgressMock(data?: unknown) {
  (useProgress as jest.Mock).mockReturnValue({ data });
}

const mockCustomPlan = {
  kind: 'custom' as const,
  id: 'plan-1',
  name: 'My Product Leadership Path',
  nextLesson: { id: 'lesson-next', title: 'Stakeholder Management Fundamentals' },
  totalLessons: 20,
  completedLessons: 5,
  percentComplete: 25,
  unresolvedTopics: 0,
  levels: [],
  isActive: false,
  canSkipLesson: false,
  canSkipTopic: false,
  canSkipLevel: false,
  averageScore: null,
  capstoneScore: null,
  upgradeRequired: false,
};

describe('LessonsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedEdges = undefined;
    mockTrackPaths = undefined;
    mockCustomPaths = undefined;
    setEnrollmentsMock(undefined);
    setCustomPlansMock(undefined);
    setProgressMock(undefined);
    (useSkipLesson as jest.Mock).mockReturnValue({ mutate: mockSkipLessonMutate, isPending: false });
    (useSkipTopic as jest.Mock).mockReturnValue({ mutate: mockSkipTopicMutate, isPending: false });
    (useSkipLevel as jest.Mock).mockReturnValue({ mutate: mockSkipLevelMutate, isPending: false });
  });

  it('renders without errors', () => {
    expect(() => render(<LessonsScreen />)).not.toThrow();
  });

  describe('streak hero (069 A9)', () => {
    it('shows streak hero when progress data exists and track enrolled', () => {
      setProgressMock(mockProgress);
      setEnrollmentsMock([mockEnrollment]);
      render(<LessonsScreen />);
      expect(screen.getByTestId('streak-hero')).toBeTruthy();
    });

    it('shows the Ring inside the streak hero', () => {
      setProgressMock(mockProgress);
      setEnrollmentsMock([mockEnrollment]);
      render(<LessonsScreen />);
      expect(screen.getByTestId('streak-ring')).toBeTruthy();
    });

    it('passes streak count as ring label', () => {
      setProgressMock({ ...mockProgress, currentStreak: 7 });
      setEnrollmentsMock([mockEnrollment]);
      render(<LessonsScreen />);
      expect(screen.getByTestId('streak-ring-label').props.children).toBe('7');
    });

    it('shows zero-state copy when streak is 0', () => {
      setProgressMock({ ...mockProgress, currentStreak: 0 });
      setEnrollmentsMock([mockEnrollment]);
      render(<LessonsScreen />);
      expect(screen.getByText('Complete a lesson today to start your streak')).toBeTruthy();
    });

    it('does not show streak hero when progress is undefined', () => {
      setEnrollmentsMock([mockEnrollment]);
      render(<LessonsScreen />);
      expect(screen.queryByTestId('streak-hero')).toBeNull();
    });

    it('does not show streak hero while no track is enrolled', () => {
      setProgressMock(mockProgress);
      setEnrollmentsMock([]);
      render(<LessonsScreen />);
      expect(screen.queryByTestId('streak-hero')).toBeNull();
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

    it('shows the last completed path (not NoTrackNotice) when all paths are inactive', () => {
      // A user who finished their active path still has history — NoTrackNotice is wrong for them.
      setEnrollmentsMock([mockCompletedEnrollment]);
      render(<LessonsScreen />);
      expect(screen.queryByTestId('no-track-notice')).toBeNull();
      expect(screen.getByText('Product Strategy')).toBeTruthy();
      expect(screen.getByTestId('choose-next-path-btn')).toBeTruthy();
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

      it('shows the active level label beneath the segmented bar', () => {
        // beginner: 15/20 (active), intermediate: 5/20 (active), advanced: 0/10 (locked)
        // first active level found → "Beginner in progress"
        setEnrollmentsMock([{ ...mockEnrollment, levels: mockLevels }]);
        render(<LessonsScreen />);
        expect(screen.getByText('Beginner in progress')).toBeTruthy();
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

  describe('skip lesson (076h)', () => {
    it('shows Skip Lesson button when canSkipLesson is true', () => {
      setEnrollmentsMock([{ ...mockEnrollment, canSkipLesson: true }]);
      render(<LessonsScreen />);
      expect(screen.getByTestId('skip-lesson-btn-skill-1')).toBeTruthy();
    });

    it('does not show Skip Lesson button when canSkipLesson is false', () => {
      setEnrollmentsMock([{ ...mockEnrollment, canSkipLesson: false }]);
      render(<LessonsScreen />);
      expect(screen.queryByTestId('skip-lesson-btn-skill-1')).toBeNull();
    });

    it('calls skipLesson mutation with the path ref when Skip Lesson is pressed', () => {
      setEnrollmentsMock([{ ...mockEnrollment, canSkipLesson: true }]);
      render(<LessonsScreen />);
      fireEvent.press(screen.getByTestId('skip-lesson-btn-skill-1'));
      expect(mockSkipLessonMutate).toHaveBeenCalledWith({ kind: 'track', id: 'skill-1' });
    });

    it('works for a custom path too', () => {
      setCustomPlansMock([{ ...mockCustomPlan, canSkipLesson: true }]);
      render(<LessonsScreen />);
      fireEvent.press(screen.getByTestId('skip-lesson-btn-plan-1'));
      expect(mockSkipLessonMutate).toHaveBeenCalledWith({ kind: 'custom', id: 'plan-1' });
    });

    it('disables Skip Lesson button while the mutation is pending', () => {
      (useSkipLesson as jest.Mock).mockReturnValue({ mutate: mockSkipLessonMutate, isPending: true });
      setEnrollmentsMock([{ ...mockEnrollment, canSkipLesson: true }]);
      render(<LessonsScreen />);
      expect(screen.getByTestId('skip-lesson-btn-skill-1').props.accessibilityState?.disabled).toBe(true);
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

    it('calls skipTopic mutation with the path ref when Skip Topic is pressed', () => {
      setEnrollmentsMock([{ ...mockEnrollment, canSkipTopic: true }]);
      render(<LessonsScreen />);
      fireEvent.press(screen.getByTestId('skip-topic-btn-skill-1'));
      expect(mockSkipTopicMutate).toHaveBeenCalledWith({ kind: 'track', id: 'skill-1' });
    });

    it('calls skipLevel mutation with the path ref when Skip Level is pressed', () => {
      setEnrollmentsMock([{ ...mockEnrollment, canSkipLevel: true }]);
      render(<LessonsScreen />);
      fireEvent.press(screen.getByTestId('skip-level-btn-skill-1'));
      expect(mockSkipLevelMutate).toHaveBeenCalledWith({ kind: 'track', id: 'skill-1' });
    });

    it('offers Skip Topic on a custom path too — the same affordance a track gets', () => {
      setCustomPlansMock([{ ...mockCustomPlan, canSkipTopic: true }]);
      render(<LessonsScreen />);
      fireEvent.press(screen.getByTestId('skip-topic-btn-plan-1'));
      expect(mockSkipTopicMutate).toHaveBeenCalledWith({ kind: 'custom', id: 'plan-1' });
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

  describe('no-track state (069 items 1+2)', () => {
    it('shows the no-track notice when no enrollments', () => {
      setEnrollmentsMock([]);
      render(<LessonsScreen />);
      expect(screen.getByTestId('no-track-notice')).toBeTruthy();
    });

    it('hides the notice when enrollments exist', () => {
      setEnrollmentsMock([mockEnrollment]);
      render(<LessonsScreen />);
      expect(screen.queryByTestId('no-track-notice')).toBeNull();
    });

    it('hides the notice while enrollments are loading', () => {
      setEnrollmentsMock(undefined);
      render(<LessonsScreen />);
      expect(screen.queryByTestId('no-track-notice')).toBeNull();
    });

    it('routes to tracks from the notice', () => {
      setEnrollmentsMock([]);
      render(<LessonsScreen />);
      fireEvent.press(screen.getByTestId('no-track-browse-btn'));
      expect(mockPush).toHaveBeenCalledWith('/(tabs)/tracks');
    });

    // A brand-new user used to meet a 0-day streak, 0 lessons and 0% average
    // before reaching the one action open to them.
    it('suppresses the zeroed streak hero while no track is enrolled', () => {
      setEnrollmentsMock([]);
      setProgressMock(mockProgress);
      render(<LessonsScreen />);
      expect(screen.queryByTestId('streak-hero')).toBeNull();
      expect(screen.queryByTestId('streak-banner')).toBeNull();
    });

    it('shows the streak hero again once a track is enrolled', () => {
      setEnrollmentsMock([mockEnrollment]);
      setProgressMock(mockProgress);
      render(<LessonsScreen />);
      expect(screen.getByTestId('streak-hero')).toBeTruthy();
    });
  });

  describe('active track prominence (ticket 044)', () => {
    const secondEnrollment = {
      ...mockEnrollment,
      id: 'skill-3',
      name: 'Business Strategy',
      skill: { id: 'skill-3', name: 'Business Strategy', category: 'Business', description: '' },
      nextLesson: { ...mockNextLesson, id: 'lesson-3', title: 'Business Foundations' },
      isActive: true,
    };

    it('shows only the active path — inactive paths are hidden on Home (076g §1)', () => {
      // Home renders exactly one path card: the active one. Switching paths belongs on Tracks.
      setEnrollmentsMock([secondEnrollment, mockEnrollment]);
      render(<LessonsScreen />);
      expect(screen.getByTestId('enrollment-card-skill-3')).toBeTruthy();
      expect(screen.queryByTestId('enrollment-card-skill-1')).toBeNull();
    });

    it('shows ACTIVE badge on the active path progress card (076g §3)', () => {
      // Badge moved from next-lesson card to progress card; testID is unchanged.
      setEnrollmentsMock([{ ...mockEnrollment, isActive: true }]);
      render(<LessonsScreen />);
      expect(screen.getByTestId('active-track-label-skill-1')).toBeTruthy();
    });

    it('does not show ACTIVE badge on a non-active path', () => {
      setEnrollmentsMock([mockEnrollment]);
      render(<LessonsScreen />);
      expect(screen.queryByTestId('active-track-label-skill-1')).toBeNull();
    });
  });

  describe('custom paths render as paths (ticket 074)', () => {
    it('renders nothing extra when there are no custom paths', () => {
      setCustomPlansMock([]);
      render(<LessonsScreen />);
      expect(screen.queryByTestId('next-lesson-card-plan-1')).toBeNull();
    });

    it('renders a custom path through the same card a track uses', () => {
      setCustomPlansMock([mockCustomPlan]);
      render(<LessonsScreen />);
      // Same testIDs as a track: there is one card component now (C16).
      expect(screen.getByTestId('next-lesson-card-plan-1')).toBeTruthy();
      expect(screen.getByTestId('enrollment-card-plan-1')).toBeTruthy();
    });

    it('badges a custom path so the user can tell where it came from', () => {
      setCustomPlansMock([mockCustomPlan]);
      render(<LessonsScreen />);
      expect(screen.getByTestId('custom-path-label-plan-1')).toBeTruthy();
    });

    it('renders the path name', () => {
      setCustomPlansMock([mockCustomPlan]);
      render(<LessonsScreen />);
      // Once on the next-lesson card, once on the progress card — same as a track.
      expect(screen.getAllByText('My Product Leadership Path').length).toBeGreaterThan(0);
      expect(screen.getByTestId('path-name-plan-1')).toBeTruthy();
    });

    it('gives a custom path the next-lesson CTA that was missing (ticket point 3)', () => {
      setCustomPlansMock([mockCustomPlan]);
      render(<LessonsScreen />);
      expect(screen.getByText('Stakeholder Management Fundamentals')).toBeTruthy();
      expect(screen.getByTestId('next-lesson-btn-plan-1')).toBeTruthy();
    });

    it('navigates to the lesson route when Start Lesson is pressed', () => {
      setCustomPlansMock([mockCustomPlan]);
      render(<LessonsScreen />);
      fireEvent.press(screen.getByTestId('next-lesson-btn-plan-1'));
      expect(mockPush).toHaveBeenCalledWith('/(tabs)/lesson/lesson-next');
    });

    it('shows no-lesson fallback when nextLesson is null', () => {
      setCustomPlansMock([{ ...mockCustomPlan, nextLesson: null }]);
      render(<LessonsScreen />);
      expect(screen.getByTestId('no-next-lesson-plan-1')).toBeTruthy();
      expect(screen.queryByTestId('next-lesson-btn-plan-1')).toBeNull();
    });

    it('can be the active path — the badge is not track-only', () => {
      setCustomPlansMock([{ ...mockCustomPlan, isActive: true }]);
      render(<LessonsScreen />);
      expect(screen.getByTestId('active-track-label-plan-1')).toBeTruthy();
    });

    it('shows unresolved-topics note when unresolvedTopics > 0', () => {
      setCustomPlansMock([{ ...mockCustomPlan, unresolvedTopics: 3 }]);
      render(<LessonsScreen />);
      expect(screen.getByTestId('plan-unresolved-plan-1')).toBeTruthy();
      expect(screen.getByText('3 topics not yet available')).toBeTruthy();
    });

    it('uses singular "topic" when unresolvedTopics is 1', () => {
      setCustomPlansMock([{ ...mockCustomPlan, unresolvedTopics: 1 }]);
      render(<LessonsScreen />);
      expect(screen.getByText('1 topic not yet available')).toBeTruthy();
    });

    it('does not show unresolved-topics note when unresolvedTopics is 0', () => {
      setCustomPlansMock([mockCustomPlan]);
      render(<LessonsScreen />);
      expect(screen.queryByTestId('plan-unresolved-plan-1')).toBeNull();
    });

    it('suppresses NoTrackNotice when user has no enrollments but has a custom plan', () => {
      setEnrollmentsMock([]);
      setCustomPlansMock([mockCustomPlan]);
      render(<LessonsScreen />);
      expect(screen.queryByTestId('no-track-notice')).toBeNull();
    });

    it('shows streak hero when user has a custom plan but no enrollments', () => {
      setEnrollmentsMock([]);
      setCustomPlansMock([mockCustomPlan]);
      setProgressMock(mockProgress);
      render(<LessonsScreen />);
      expect(screen.getByTestId('streak-hero')).toBeTruthy();
    });
  });

  describe('Ticket 072j — safe-area edges', () => {
    it('uses edges=[left,right,bottom] so the tab layout owns the top inset', () => {
      render(<LessonsScreen />);
      expect(capturedEdges).toEqual(['left', 'right', 'bottom']);
    });
  });

  describe('076g — Home is the active path', () => {
    it('progress card renders before next-lesson card (streak → path progress → next lesson)', () => {
      setEnrollmentsMock([{ ...mockEnrollment, isActive: true }]);
      render(<LessonsScreen />);
      const json = JSON.stringify(screen.toJSON());
      const enrollmentIdx = json.indexOf('enrollment-card-skill-1');
      const nextLessonIdx = json.indexOf('next-lesson-card-skill-1');
      expect(enrollmentIdx).toBeGreaterThan(-1);
      expect(nextLessonIdx).toBeGreaterThan(-1);
      expect(enrollmentIdx).toBeLessThan(nextLessonIdx);
    });

    it('shows only the active path when multiple paths exist', () => {
      const active = { ...mockEnrollment, id: 'skill-a', name: 'Active Track', isActive: true };
      const inactive = { ...mockEnrollment, id: 'skill-b', name: 'Inactive Track', isActive: false };
      setEnrollmentsMock([active, inactive]);
      render(<LessonsScreen />);
      expect(screen.getByTestId('enrollment-card-skill-a')).toBeTruthy();
      expect(screen.queryByTestId('enrollment-card-skill-b')).toBeNull();
    });

    it('shows last path + choose-next-path CTA when paths exist but none is active', () => {
      setEnrollmentsMock([{ ...mockEnrollment, isActive: false }]);
      render(<LessonsScreen />);
      expect(screen.queryByTestId('no-track-notice')).toBeNull();
      expect(screen.getByTestId('enrollment-card-skill-1')).toBeTruthy();
      expect(screen.getByTestId('choose-next-path-btn')).toBeTruthy();
    });

    it('routes choose-next-path CTA to Tracks', () => {
      setEnrollmentsMock([{ ...mockEnrollment, isActive: false }]);
      render(<LessonsScreen />);
      fireEvent.press(screen.getByTestId('choose-next-path-btn'));
      expect(mockPush).toHaveBeenCalledWith('/(tabs)/tracks');
    });

    it('does not show choose-next-path CTA when a path is active', () => {
      setEnrollmentsMock([{ ...mockEnrollment, isActive: true }]);
      render(<LessonsScreen />);
      expect(screen.queryByTestId('choose-next-path-btn')).toBeNull();
    });

    it('path name testID is in the progress card, not the next-lesson card', () => {
      setEnrollmentsMock([{ ...mockEnrollment, isActive: true }]);
      render(<LessonsScreen />);
      // testID was on the small-uppercase label in next-lesson card; it now lives in enrollment-card.
      expect(screen.getByTestId('path-name-skill-1')).toBeTruthy();
      expect(screen.getByTestId('enrollment-card-skill-1')).toBeTruthy();
    });
  });
});
