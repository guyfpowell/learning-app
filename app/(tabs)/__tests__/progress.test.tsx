import React from 'react';
import { PATHS_LOAD_ERROR } from '@learning/shared';
import { render, screen, fireEvent, within } from '@testing-library/react-native';
import ProgressScreen from '../progress';
import { useProgress } from '@/hooks/useProgress';
import { usePaths } from '@/hooks/useTrack';
import { useXp } from '@/hooks/useXp';
import { TRACKS_ROUTE } from '@/lib/routes';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

jest.mock('@/hooks/useProgress', () => ({ useProgress: jest.fn() }));
jest.mock('@/hooks/useTrack', () => ({ usePaths: jest.fn() }));
jest.mock('@/hooks/useXp', () => ({ useXp: jest.fn() }));
jest.mock('@/hooks/useAchievements', () => ({ useAchievements: jest.fn(() => ({ data: undefined, isLoading: false })) }));
let capturedEdges: string[] | undefined;
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, edges }: { children: React.ReactNode; edges?: string[] }) => {
    capturedEdges = edges;
    return <>{children}</>;
  },
}));

const mockStats = {
  totalLessonsCompleted: 5,
  currentStreak: 3,
  averageScore: 82,
  lastLessonDate: new Date('2026-04-13T00:00:00.000Z'),
};

const mockActiveEnrollment = {
  kind: 'track' as const,
  id: 'skill-1',
  name: 'JavaScript Fundamentals',
  skill: { id: 'skill-1', name: 'JavaScript Fundamentals' },
  completedLessons: 3,
  totalLessons: 10,
  percentComplete: 30,
  levels: [],
  averageScore: null,
  capstoneScore: null,
  enrolledAt: new Date('2026-01-01T00:00:00.000Z'),
  completedAt: null,
};

const mockCompletedEnrollment = {
  kind: 'track' as const,
  id: 'skill-2',
  name: 'React Basics',
  skill: { id: 'skill-2', name: 'React Basics' },
  completedLessons: 15,
  totalLessons: 15,
  percentComplete: 100,
  levels: [],
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
    capturedEdges = undefined;
    (usePaths as jest.Mock).mockReturnValue({ data: undefined });
    (useXp as jest.Mock).mockReturnValue({ data: undefined });
  });

  it('renders without errors', () => {
    setMock();
    expect(() => render(<ProgressScreen />)).not.toThrow();
  });

  // Parity with web refactor R5.
  it('says the paths failed to load', () => {
    setMock();
    (usePaths as jest.Mock).mockReturnValue({ data: undefined, isError: true });
    const { getByTestId } = render(<ProgressScreen />);
    expect(getByTestId('paths-load-error')).toHaveTextContent(PATHS_LOAD_ERROR);
  });

  it('096: has no "My Progress" heading: the selected tab already says where you are', () => {
    setMock();
    render(<ProgressScreen />);
    expect(screen.queryByText('My Progress')).toBeNull();
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

  it('096: no last-lesson date card', () => {
    setMock({ data: mockStats });
    render(<ProgressScreen />);
    expect(screen.queryByText(/Last lesson/i)).toBeNull();
  });

  it('096: the three numbers are one quiet row, with no boxes and no flame', () => {
    setMock({ data: mockStats });
    render(<ProgressScreen />);
    const row = within(screen.getByTestId('progress-stats'));
    expect(row.getByTestId('progress-lessons-count')).toBeTruthy();
    expect(row.getByTestId('progress-avg-score')).toBeTruthy();
    expect(row.getByTestId('progress-streak')).toBeTruthy();
    expect(row.getByText('Average quiz score')).toBeTruthy();
    expect(screen.queryByTestId('progress-streak-card')).toBeNull();
  });

  it('096: the achievements move here from Profile', () => {
    setMock({ data: mockStats });
    render(<ProgressScreen />);
    expect(screen.getByTestId('achievements-section')).toBeTruthy();
  });
});

describe('ProgressScreen — enrollment cards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useProgress as jest.Mock).mockReturnValue({ data: undefined, isLoading: false, isError: false });
    (useXp as jest.Mock).mockReturnValue({ data: undefined });
  });

  it('shows active enrollment card with track name and % complete', () => {
    (usePaths as jest.Mock).mockReturnValue({ data: [mockActiveEnrollment] });
    render(<ProgressScreen />);
    expect(screen.getByText('JavaScript Fundamentals')).toBeTruthy();
    expect(screen.getByText('30% complete')).toBeTruthy();
  });

  it('shows lessons count on active enrollment card', () => {
    (usePaths as jest.Mock).mockReturnValue({ data: [mockActiveEnrollment] });
    render(<ProgressScreen />);
    expect(screen.getByText('3 of 10 lessons complete')).toBeTruthy();
  });

  it('096: no motivation line that repeats the path name; the next lesson shows instead', () => {
    (usePaths as jest.Mock).mockReturnValue({
      data: [{ ...mockActiveEnrollment, nextLesson: { id: 'l9', title: 'Closures', skillPath: { level: 'beginner' }, topicName: 'Functions', lessonIndex: 4, totalLessons: 10 } }],
    });
    render(<ProgressScreen />);
    expect(screen.queryByText(/Only 7 lessons to complete|keep going/i)).toBeNull();
    expect(screen.getByText('Next: Closures')).toBeTruthy();
  });

  it('shows completed track with Terminus achievement badge', () => {
    (usePaths as jest.Mock).mockReturnValue({ data: [mockCompletedEnrollment] });
    render(<ProgressScreen />);
    expect(screen.getByText('React Basics')).toBeTruthy();
    expect(screen.getByText('TERMINUS')).toBeTruthy();
  });

  it('shows completed track with date and lessons total', () => {
    (usePaths as jest.Mock).mockReturnValue({ data: [mockCompletedEnrollment] });
    render(<ProgressScreen />);
    expect(screen.getByTestId('completed-date-skill-2')).toBeTruthy();
    expect(screen.getByText(/15 of 15 lessons/)).toBeTruthy();
  });

  it('shows capstone score on completed track card (preferred over average)', () => {
    (usePaths as jest.Mock).mockReturnValue({ data: [mockCompletedEnrollment] });
    render(<ProgressScreen />);
    expect(screen.getByText('92%')).toBeTruthy();
  });

  it('shows average score on completed track card when no capstone', () => {
    (usePaths as jest.Mock).mockReturnValue({
      data: [{ ...mockCompletedEnrollment, capstoneScore: null }],
    });
    render(<ProgressScreen />);
    expect(screen.getByText('85%')).toBeTruthy();
  });

  it('shows share and next-track buttons on completed track card', () => {
    (usePaths as jest.Mock).mockReturnValue({ data: [mockCompletedEnrollment] });
    render(<ProgressScreen />);
    expect(screen.getByTestId('completed-share-skill-2')).toBeTruthy();
    expect(screen.getByTestId('completed-next-track-skill-2')).toBeTruthy();
  });

  it('next-track button routes to tracks tab', () => {
    (usePaths as jest.Mock).mockReturnValue({ data: [mockCompletedEnrollment] });
    render(<ProgressScreen />);
    fireEvent.press(screen.getByTestId('completed-next-track-skill-2'));
    expect(mockPush).toHaveBeenCalledWith(TRACKS_ROUTE);
  });

  it('shows both active and completed sections when both present', () => {
    (usePaths as jest.Mock).mockReturnValue({
      data: [mockActiveEnrollment, mockCompletedEnrollment],
    });
    render(<ProgressScreen />);
    expect(screen.getByText('Your path')).toBeTruthy();
    expect(screen.getByText('Completed')).toBeTruthy();
  });

  it('shows empty state when enrollments array is empty', () => {
    (usePaths as jest.Mock).mockReturnValue({ data: [] });
    render(<ProgressScreen />);
    expect(screen.getByTestId('no-track-notice')).toBeTruthy();
  });

  it('does not show enrollment sections while loading (data undefined)', () => {
    (usePaths as jest.Mock).mockReturnValue({ data: undefined });
    render(<ProgressScreen />);
    expect(screen.queryByText('Your path')).toBeNull();
    expect(screen.queryByText('Completed')).toBeNull();
    expect(screen.queryByTestId('no-track-notice')).toBeNull();
  });

  it('does not show completed section for active-only enrollments', () => {
    (usePaths as jest.Mock).mockReturnValue({ data: [mockActiveEnrollment] });
    render(<ProgressScreen />);
    expect(screen.queryByText('Completed')).toBeNull();
  });

  it('does not show active section for completed-only enrollments', () => {
    (usePaths as jest.Mock).mockReturnValue({ data: [mockCompletedEnrollment] });
    render(<ProgressScreen />);
    expect(screen.queryByText('Your path')).toBeNull();
  });

  it('does not show Saved section', () => {
    (usePaths as jest.Mock).mockReturnValue({ data: [] });
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
    (usePaths as jest.Mock).mockReturnValue({ data: undefined });
    (useXp as jest.Mock).mockReturnValue({ data: undefined });
  });

  it('renders segmented level nodes on active enrollment card when levels provided', () => {
    setMock({ data: undefined });
    (usePaths as jest.Mock).mockReturnValue({
      data: [{ ...mockActiveEnrollment, levels: mockLevels }],
    });
    render(<ProgressScreen />);
    expect(screen.getAllByTestId('track-map-level')).toHaveLength(2);
  });

  it('096: the strip shows no "<Level> in progress" line; the highlighted level says it', () => {
    setMock({ data: undefined });
    (usePaths as jest.Mock).mockReturnValue({
      data: [{ ...mockActiveEnrollment, levels: mockLevels }],
    });
    render(<ProgressScreen />);
    expect(screen.getAllByTestId('track-map-level')).toHaveLength(2);
    expect(screen.queryByText(/in progress/i)).toBeNull();
  });

  it('does not render TrackMap when enrollment has no levels', () => {
    setMock({ data: undefined });
    (usePaths as jest.Mock).mockReturnValue({
      data: [{ ...mockActiveEnrollment, levels: [] }],
    });
    render(<ProgressScreen />);
    expect(screen.queryByTestId('track-map-level')).toBeNull();
  });
});

describe('ProgressScreen — Ticket 070 XP card', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (usePaths as jest.Mock).mockReturnValue({ data: undefined });
    setMock({ data: mockStats });
  });

  it('shows XP total when xp data is available', () => {
    (useXp as jest.Mock).mockReturnValue({
      data: { totalXp: 1250, nextMilestone: null },
    });
    render(<ProgressScreen />);
    expect(screen.getByTestId('xp-card')).toBeTruthy();
    expect(screen.getByTestId('xp-total')).toBeTruthy();
    expect(screen.getByText('1,250 XP')).toBeTruthy();
  });

  it('shows next milestone label and remaining XP when nextMilestone is set', () => {
    (useXp as jest.Mock).mockReturnValue({
      data: {
        totalXp: 500,
        nextMilestone: { key: 'base-camp', name: 'Base Camp', xpRequired: 2000, xpRemaining: 1500 },
      },
    });
    render(<ProgressScreen />);
    expect(screen.getByTestId('xp-next-label')).toBeTruthy();
    expect(screen.getByText('Base Camp in 1,500 XP')).toBeTruthy();
    expect(screen.getByTestId('xp-progress-bar')).toBeTruthy();
  });

  it('hides XP card when xp data is not available', () => {
    (useXp as jest.Mock).mockReturnValue({ data: undefined });
    render(<ProgressScreen />);
    expect(screen.queryByTestId('xp-card')).toBeNull();
  });

  it('does not show progress bar when nextMilestone is null and tier is absent', () => {
    (useXp as jest.Mock).mockReturnValue({
      data: { totalXp: 200000, nextMilestone: null, tier: null },
    });
    render(<ProgressScreen />);
    expect(screen.getByTestId('xp-card')).toBeTruthy();
    expect(screen.queryByTestId('xp-progress-bar')).toBeNull();
  });

  // ── Ticket 070a — tier / level display ─────────────────────────────────────

  it('shows tier label when tier is provided', () => {
    (useXp as jest.Mock).mockReturnValue({
      data: {
        totalXp: 2200,
        nextMilestone: { key: 'ridgeline', name: 'Ridgeline', xpRequired: 4000, xpRemaining: 1800 },
        tier: { key: 'base-camp', name: 'Base Camp', level: 3, label: 'Base Camp III', floor: 2200, ceiling: 2800 },
      },
    });
    render(<ProgressScreen />);
    expect(screen.getByTestId('xp-tier-label')).toBeTruthy();
    expect(screen.getByText('Base Camp III')).toBeTruthy();
  });

  it('shows level progress bar (current level) when tier is set', () => {
    (useXp as jest.Mock).mockReturnValue({
      data: {
        totalXp: 2200,
        nextMilestone: { key: 'ridgeline', name: 'Ridgeline', xpRequired: 4000, xpRemaining: 1800 },
        tier: { key: 'base-camp', name: 'Base Camp', level: 3, label: 'Base Camp III', floor: 2200, ceiling: 2800 },
      },
    });
    render(<ProgressScreen />);
    expect(screen.getByTestId('xp-progress-bar')).toBeTruthy();
  });

  it('shows "to next level" hint when tier is active', () => {
    (useXp as jest.Mock).mockReturnValue({
      data: {
        totalXp: 2200,
        nextMilestone: { key: 'ridgeline', name: 'Ridgeline', xpRequired: 4000, xpRemaining: 1800 },
        tier: { key: 'base-camp', name: 'Base Camp', level: 3, label: 'Base Camp III', floor: 2200, ceiling: 2800 },
      },
    });
    render(<ProgressScreen />);
    expect(screen.getByTestId('xp-level-hint')).toBeTruthy();
    expect(screen.getByText('600 XP to next level')).toBeTruthy();
  });

  it('falls back to next-milestone label when tier is null', () => {
    (useXp as jest.Mock).mockReturnValue({
      data: {
        totalXp: 100,
        nextMilestone: { key: 'foothills', name: 'Foothills', xpRequired: 150, xpRemaining: 50 },
        tier: null,
      },
    });
    render(<ProgressScreen />);
    expect(screen.getByTestId('xp-next-label')).toBeTruthy();
    expect(screen.queryByTestId('xp-tier-label')).toBeNull();
  });
});

describe('ProgressScreen — Ticket 072j safe-area edges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedEdges = undefined;
    (useProgress as jest.Mock).mockReturnValue({ data: undefined, isLoading: false, isError: false });
    (usePaths as jest.Mock).mockReturnValue({ data: undefined });
    (useXp as jest.Mock).mockReturnValue({ data: undefined });
  });

  it('uses edges=[left,right] so the tab layout owns the top inset and the tab bar the bottom one (090)', () => {
    render(<ProgressScreen />);
    expect(capturedEdges).toEqual(['left', 'right']);
  });
});

// ── 096 — a path card opens its detail ──────────────────────────────────────

describe('ProgressScreen — path cards open their detail (096)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useProgress as jest.Mock).mockReturnValue({ data: undefined, isLoading: false, isError: false });
    (useXp as jest.Mock).mockReturnValue({ data: undefined });
  });

  it('tapping an in-progress path card opens that path\'s detail', () => {
    (usePaths as jest.Mock).mockReturnValue({ data: [mockActiveEnrollment] });
    render(<ProgressScreen />);
    fireEvent.press(screen.getByTestId('path-card-link-skill-1'));
    expect(mockPush).toHaveBeenCalledWith('/track/track/skill-1');
  });

  it('has no lessons toggle or inline tree any more', () => {
    (usePaths as jest.Mock).mockReturnValue({ data: [mockActiveEnrollment] });
    render(<ProgressScreen />);
    expect(screen.queryByTestId('path-expand-btn-skill-1')).toBeNull();
    expect(screen.queryByText('Show lessons')).toBeNull();
  });

  it('a completed card opens its detail too, but Find next track still goes to Tracks', () => {
    (usePaths as jest.Mock).mockReturnValue({ data: [mockCompletedEnrollment] });
    render(<ProgressScreen />);
    fireEvent.press(screen.getByTestId(`path-card-link-${mockCompletedEnrollment.id}`));
    expect(mockPush).toHaveBeenCalledWith(`/track/track/${mockCompletedEnrollment.id}`);
    mockPush.mockClear();
    fireEvent.press(screen.getByTestId(`completed-next-track-${mockCompletedEnrollment.id}`));
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(TRACKS_ROUTE);
  });
});

describe('ProgressScreen — 076e custom path progress bar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useProgress as jest.Mock).mockReturnValue({ data: undefined, isLoading: false, isError: false });
    (useXp as jest.Mock).mockReturnValue({ data: undefined });
  });

  it('shows a progress bar on custom path card (levels empty)', () => {
    const customPath = {
      kind: 'custom' as const,
      hasProposal: false,
      revisit: null,
      id: 'plan-1',
      name: 'My Custom Path',
      completedLessons: 3,
      totalLessons: 10,
      percentComplete: 30,
      levels: [],
      averageScore: null,
      capstoneScore: null,
    };
    (usePaths as jest.Mock).mockReturnValue({ data: [customPath] });
    render(<ProgressScreen />);
    expect(screen.getByTestId('path-progress-bar-plan-1')).toBeTruthy();
  });

  it('does not show TrackMap for custom path (levels empty)', () => {
    const customPath = {
      kind: 'custom' as const,
      hasProposal: false,
      revisit: null,
      id: 'plan-1',
      name: 'My Custom Path',
      completedLessons: 3,
      totalLessons: 10,
      percentComplete: 30,
      levels: [],
      averageScore: null,
      capstoneScore: null,
    };
    (usePaths as jest.Mock).mockReturnValue({ data: [customPath] });
    render(<ProgressScreen />);
    expect(screen.queryByTestId('track-map-level')).toBeNull();
  });

  it('shows TrackMap for curated track with levels, not progress bar', () => {
    const mockLevels = [
      { level: 'beginner', levelNum: 1, totalLessons: 10, completedLessons: 3, percentComplete: 30 },
    ];
    (usePaths as jest.Mock).mockReturnValue({
      data: [{ ...mockActiveEnrollment, levels: mockLevels }],
    });
    render(<ProgressScreen />);
    expect(screen.getAllByTestId('track-map-level')).toHaveLength(1);
    expect(screen.queryByTestId('path-progress-bar-skill-1')).toBeNull();
  });
});
