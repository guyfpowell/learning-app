import React from 'react';
import { render, screen } from '@testing-library/react-native';
import ProgressScreen from '../progress';
import { useProgress } from '@/hooks/useProgress';

jest.mock('@/hooks/useProgress', () => ({ useProgress: jest.fn() }));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockStats = {
  totalLessonsCompleted: 5,
  currentStreak: 3,
  averageScore: 82,
  lastLessonDate: new Date('2026-04-13T00:00:00.000Z'),
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
  beforeEach(() => jest.clearAllMocks());

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
