import React from 'react';
import { render, screen } from '@testing-library/react-native';
import ProgressScreen from '../progress';
import { useProgress } from '@/hooks/useProgress';
import { useSavedLessons } from '@/hooks/useLesson';
import { useEnrollments } from '@/hooks/useTrack';

jest.mock('@/hooks/useProgress', () => ({ useProgress: jest.fn() }));
jest.mock('@/hooks/useLesson', () => ({ useSavedLessons: jest.fn() }));
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
};

const mockCompletedEnrollment = {
  skillId: 'skill-2',
  skill: { id: 'skill-2', name: 'React Basics' },
  completedLessons: 15,
  totalLessons: 15,
  percentComplete: 100,
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
    (useSavedLessons as jest.Mock).mockReturnValue({ data: [] });
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
});

describe('ProgressScreen — enrollment cards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useProgress as jest.Mock).mockReturnValue({ data: undefined, isLoading: false, isError: false });
    (useSavedLessons as jest.Mock).mockReturnValue({ data: [] });
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

  it('shows completed track with Completed badge', () => {
    (useEnrollments as jest.Mock).mockReturnValue({ data: [mockCompletedEnrollment] });
    render(<ProgressScreen />);
    expect(screen.getByText('React Basics')).toBeTruthy();
    expect(screen.getByText('Completed')).toBeTruthy();
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
    expect(screen.getByTestId('no-enrollments-msg')).toBeTruthy();
  });

  it('does not show enrollment sections while loading (data undefined)', () => {
    (useEnrollments as jest.Mock).mockReturnValue({ data: undefined });
    render(<ProgressScreen />);
    expect(screen.queryByText('Active Tracks')).toBeNull();
    expect(screen.queryByText('Completed Tracks')).toBeNull();
    expect(screen.queryByTestId('no-enrollments-msg')).toBeNull();
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
});
