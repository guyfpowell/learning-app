import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import ProgressScreen from '../progress';
import { useProgress } from '@/hooks/useProgress';
import { useEnrollments } from '@/hooks/useTrack';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

jest.mock('@/hooks/useProgress', () => ({ useProgress: jest.fn() }));
jest.mock('@/hooks/useTrack', () => ({ useEnrollments: jest.fn() }));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockStats = {
  totalLessonsCompleted: 5,
  currentStreak: 3,
  averageScore: 82,
  lastLessonDate: new Date('2026-04-13T00:00:00.000Z'),
};

const mockActiveEnrollment = {
  skillId: 'skill-1',
  skill: { id: 'skill-1', name: 'JavaScript Fundamentals' },
  completedLessons: 3,
  totalLessons: 10,
  percentComplete: 30,
  averageScore: null,
  capstoneScore: null,
  enrolledAt: new Date('2026-01-01T00:00:00.000Z'),
  completedAt: null,
};

const mockCompletedEnrollment = {
  skillId: 'skill-2',
  skill: { id: 'skill-2', name: 'React Basics' },
  completedLessons: 15,
  totalLessons: 15,
  percentComplete: 100,
  averageScore: 85,
  capstoneScore: 92,
  enrolledAt: new Date('2026-01-01T00:00:00.000Z'),
  completedAt: new Date('2026-03-01T00:00:00.000Z'),
};

function setMock(overrides: Record<string, unknown> = {}) {
  (useProgress as jest.Mock).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    ...overrides,
  });
}

describe('ProgressScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useEnrollments as jest.Mock).mockReturnValue({ data: undefined });
  });

  it('renders without errors', () => {
    setMock();
    expect(() => render(<ProgressScreen />)).not.toThrow();
  });

  it('shows "My Progress" heading', () => {
    setMock();
    render(<ProgressScreen />);
    expect(screen.getByText('My Progress')).toBeTruthy();
  });

  it('shows error message when fetch fails', () => {
    setMock({ isError: true });
    render(<ProgressScreen />);
    expect(screen.getByText('Unable to load progress. Please try again.')).toBeTruthy();
  });

  it('shows no data message when data is null', () => {
    setMock({ data: null });
    render(<ProgressScreen />);
    expect(screen.getByText('No progress data available.')).toBeTruthy();
  });

  it('does not show stats while loading', () => {
    setMock({ isLoading: true });
    render(<ProgressScreen />);
    expect(screen.queryByText('3')).toBeNull();
  });

  it('shows current streak', () => {
    setMock({ data: mockStats });
    render(<ProgressScreen />);
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('shows total lessons completed', () => {
    setMock({ data: mockStats });
    render(<ProgressScreen />);
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('shows average score', () => {
    setMock({ data: mockStats });
    render(<ProgressScreen />);
    expect(screen.getByText('82%')).toBeTruthy();
  });

  it('rounds averageScore in the stats display', () => {
    setMock({ data: { ...mockStats, averageScore: 83.33 } });
    render(<ProgressScreen />);
    expect(screen.getByText('83%')).toBeTruthy();
    expect(screen.queryByText('83.33%')).toBeNull();
  });

  it('shows last lesson date when available', () => {
    setMock({ data: mockStats });
    render(<ProgressScreen />);
    expect(screen.getByText(/Last lesson/i)).toBeTruthy();
  });

  it('does not show last lesson date when null', () => {
    setMock({ data: { ...mockStats, lastLessonDate: null } });
    render(<ProgressScreen />);
    expect(screen.queryByText(/Last lesson/i)).toBeNull();
  });

  it('shows streak stat card with the flame SVG and count', () => {
    setMock({ data: mockStats });
    render(<ProgressScreen />);
    expect(screen.getByTestId('progress-streak')).toBeTruthy();
  });

  it('streak is a hero card above the subordinate stats', () => {
    setMock({ data: mockStats });
    render(<ProgressScreen />);
    expect(screen.getByTestId('progress-streak-card')).toBeTruthy();
    expect(screen.getByTestId('progress-streak')).toBeTruthy();
    expect(screen.getByTestId('progress-lessons-count')).toBeTruthy();
    expect(screen.getByTestId('progress-avg-score')).toBeTruthy();
  });
});

describe('ProgressScreen — enrollment cards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useProgress as jest.Mock).mockReturnValue({ data: undefined, isLoading: false, isError: false });
  });

  it('shows active enrollment card with track name and % complete', () => {
    (useEnrollments as jest.Mock).mockReturnValue({ data: [mockActiveEnrollment] });
    render(<ProgressScreen />);
    expect(screen.getByText('JavaScript Fundamentals')).toBeTruthy();
    expect(screen.getByText('30% complete')).toBeTruthy();
  });

  it('shows lessons count on active enrollment card', () => {
    (useEnrollments as jest.Mock).mockReturnValue({ data: [mockActiveEnrollment] });
    render(<ProgressScreen />);
    expect(screen.getByText('3 of 10 lessons complete')).toBeTruthy();
  });

  it('shows motivation text on active enrollment card', () => {
    (useEnrollments as jest.Mock).mockReturnValue({ data: [mockActiveEnrollment] });
    render(<ProgressScreen />);
    // lessonsLeft = 7 <= 20 → "Only 7 lessons to complete JavaScript Fundamentals!"
    expect(screen.getByText('Only 7 lessons to complete JavaScript Fundamentals!')).toBeTruthy();
  });

  it('shows completed track with Terminus achievement badge', () => {
    (useEnrollments as jest.Mock).mockReturnValue({ data: [mockCompletedEnrollment] });
    render(<ProgressScreen />);
    expect(screen.getByText('React Basics')).toBeTruthy();
    expect(screen.getByText('TERMINUS')).toBeTruthy();
  });

  it('shows completed track with date and lessons total', () => {
    (useEnrollments as jest.Mock).mockReturnValue({ data: [mockCompletedEnrollment] });
    render(<ProgressScreen />);
    expect(screen.getByTestId('completed-date-skill-2')).toBeTruthy();
    expect(screen.getByText(/15 of 15 lessons/)).toBeTruthy();
  });

  it('shows capstone score on completed track card (preferred over average)', () => {
    (useEnrollments as jest.Mock).mockReturnValue({ data: [mockCompletedEnrollment] });
    render(<ProgressScreen />);
    expect(screen.getByText('92%')).toBeTruthy();
  });

  it('shows average score on completed track card when no capstone', () => {
    (useEnrollments as jest.Mock).mockReturnValue({
      data: [{ ...mockCompletedEnrollment, capstoneScore: null }],
    });
    render(<ProgressScreen />);
    expect(screen.getByText('85%')).toBeTruthy();
  });

  it('shows share and next-track buttons on completed track card', () => {
    (useEnrollments as jest.Mock).mockReturnValue({ data: [mockCompletedEnrollment] });
    render(<ProgressScreen />);
    expect(screen.getByTestId('completed-share-skill-2')).toBeTruthy();
    expect(screen.getByTestId('completed-next-track-skill-2')).toBeTruthy();
  });

  it('next-track button routes to tracks tab', () => {
    (useEnrollments as jest.Mock).mockReturnValue({ data: [mockCompletedEnrollment] });
    render(<ProgressScreen />);
    fireEvent.press(screen.getByTestId('completed-next-track-skill-2'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/tracks');
  });

  it('shows both active and completed sections when both present', () => {
    (useEnrollments as jest.Mock).mockReturnValue({
      data: [mockActiveEnrollment, mockCompletedEnrollment],
    });
    render(<ProgressScreen />);
    expect(screen.getByText('Active Tracks')).toBeTruthy();
    expect(screen.getByText('Completed Tracks')).toBeTruthy();
  });

  it('shows empty state when enrollments array is empty', () => {
    (useEnrollments as jest.Mock).mockReturnValue({ data: [] });
    render(<ProgressScreen />);
    expect(screen.getByTestId('no-track-notice')).toBeTruthy();
  });

  it('does not show enrollment sections while loading (data undefined)', () => {
    (useEnrollments as jest.Mock).mockReturnValue({ data: undefined });
    render(<ProgressScreen />);
    expect(screen.queryByText('Active Tracks')).toBeNull();
    expect(screen.queryByText('Completed Tracks')).toBeNull();
    expect(screen.queryByTestId('no-track-notice')).toBeNull();
  });

  it('does not show completed section for active-only enrollments', () => {
    (useEnrollments as jest.Mock).mockReturnValue({ data: [mockActiveEnrollment] });
    render(<ProgressScreen />);
    expect(screen.queryByText('Completed Tracks')).toBeNull();
  });

  it('does not show active section for completed-only enrollments', () => {
    (useEnrollments as jest.Mock).mockReturnValue({ data: [mockCompletedEnrollment] });
    render(<ProgressScreen />);
    expect(screen.queryByText('Active Tracks')).toBeNull();
  });

  it('does not show Saved section', () => {
    (useEnrollments as jest.Mock).mockReturnValue({ data: [] });
    render(<ProgressScreen />);
    expect(screen.queryByText('Saved')).toBeNull();
    expect(screen.queryByText('No saved lessons yet.')).toBeNull();
  });
});

describe('ProgressScreen — P6 TrackMap segmented bar', () => {
  const mockLevels = [
    { level: 'beginner', levelNum: 1, totalLessons: 10, completedLessons: 5, percentComplete: 50 },
    { level: 'intermediate', levelNum: 2, totalLessons: 10, completedLessons: 0, percentComplete: 0 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useEnrollments as jest.Mock).mockReturnValue({ data: undefined });
  });

  it('renders segmented level nodes on active enrollment card when levels provided', () => {
    setMock({ data: undefined });
    (useEnrollments as jest.Mock).mockReturnValue({
      data: [{ ...mockActiveEnrollment, levels: mockLevels }],
    });
    render(<ProgressScreen />);
    expect(screen.getAllByTestId('track-map-level')).toHaveLength(2);
  });

  it('does not render TrackMap when enrollment has no levels', () => {
    setMock({ data: undefined });
    (useEnrollments as jest.Mock).mockReturnValue({
      data: [{ ...mockActiveEnrollment, levels: [] }],
    });
    render(<ProgressScreen />);
    expect(screen.queryByTestId('track-map-level')).toBeNull();
  });
});
