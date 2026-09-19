import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import ProgressScreen from '../progress';
import { useProgress } from '@/hooks/useProgress';
import { usePaths, useTrackContents } from '@/hooks/useTrack';
import { useXp } from '@/hooks/useXp';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

jest.mock('@/hooks/useProgress', () => ({ useProgress: jest.fn() }));
jest.mock('@/hooks/useTrack', () => ({ usePaths: jest.fn(), useTrackContents: jest.fn() }));
jest.mock('@/hooks/useXp', () => ({ useXp: jest.fn() }));
// Lightweight tree stub — tests only care that it is/isn't rendered and what props it got.
jest.mock('@/components/learning/TrackContentsTree', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mockReact = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View: MockView } = require('react-native');
  return {
    TrackContentsTree: ({ contents, initialExpanded }: { contents: { id: string }; initialExpanded?: { groupKey?: string; topicKey?: string } }) =>
      mockReact.createElement(MockView, {
        testID: 'mock-track-tree',
        accessibilityLabel: [contents.id, initialExpanded?.groupKey ?? '', initialExpanded?.topicKey ?? ''].join('|'),
      }),
  };
});

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
  description: null,
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
  description: null,
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
    (useTrackContents as jest.Mock).mockReturnValue({ data: undefined, isLoading: false });
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
    (useXp as jest.Mock).mockReturnValue({ data: undefined });
    (useTrackContents as jest.Mock).mockReturnValue({ data: undefined, isLoading: false });
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

  it('shows motivation text on active enrollment card', () => {
    (usePaths as jest.Mock).mockReturnValue({ data: [mockActiveEnrollment] });
    render(<ProgressScreen />);
    // lessonsLeft = 7 <= 20 → "Only 7 lessons to complete JavaScript Fundamentals!"
    expect(screen.getByText('Only 7 lessons to complete JavaScript Fundamentals!')).toBeTruthy();
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
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/tracks');
  });

  it('shows both active and completed sections when both present', () => {
    (usePaths as jest.Mock).mockReturnValue({
      data: [mockActiveEnrollment, mockCompletedEnrollment],
    });
    render(<ProgressScreen />);
    expect(screen.getByText('Keep Going')).toBeTruthy();
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
    expect(screen.queryByText('Keep Going')).toBeNull();
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
    expect(screen.queryByText('Keep Going')).toBeNull();
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
    (useTrackContents as jest.Mock).mockReturnValue({ data: undefined, isLoading: false });
  });

  it('renders segmented level nodes on active enrollment card when levels provided', () => {
    setMock({ data: undefined });
    (usePaths as jest.Mock).mockReturnValue({
      data: [{ ...mockActiveEnrollment, levels: mockLevels }],
    });
    render(<ProgressScreen />);
    expect(screen.getAllByTestId('track-map-level')).toHaveLength(2);
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
    (useTrackContents as jest.Mock).mockReturnValue({ data: undefined, isLoading: false });
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
    (useTrackContents as jest.Mock).mockReturnValue({ data: undefined, isLoading: false });
  });

  it('uses edges=[left,right,bottom] so the tab layout owns the top inset', () => {
    render(<ProgressScreen />);
    expect(capturedEdges).toEqual(['left', 'right', 'bottom']);
  });
});

// ── 076e — Expandable progress tree ──────────────────────────────────────────

const mockContents = {
  kind: 'track' as const,
  id: 'skill-1',
  name: 'JavaScript Fundamentals',
  enrolled: true,
  groups: [
    {
      key: 'beginner',
      label: 'Beginner',
      completedLessons: 0,
      totalLessons: 5,
      isCurrent: true,
      topics: [
        {
          key: 'topic-1',
          name: 'Variables',
          lessons: [],
          completedLessons: 0,
          totalLessons: 3,
          isCurrent: true,
          unresolved: false,
        },
      ],
    },
  ],
};

const mockCompletedContents = {
  ...mockContents,
  id: 'skill-2',
  groups: [
    {
      ...mockContents.groups[0],
      isCurrent: false,
      topics: [{ ...mockContents.groups[0].topics[0], isCurrent: false }],
    },
  ],
};

describe('ProgressScreen — 076e expandable tree', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useProgress as jest.Mock).mockReturnValue({ data: undefined, isLoading: false, isError: false });
    (useXp as jest.Mock).mockReturnValue({ data: undefined });
    (useTrackContents as jest.Mock).mockReturnValue({ data: undefined, isLoading: false });
  });

  it('shows expand toggle for each path card', () => {
    (usePaths as jest.Mock).mockReturnValue({ data: [mockActiveEnrollment] });
    render(<ProgressScreen />);
    expect(screen.getByTestId('path-expand-btn-skill-1')).toBeTruthy();
  });

  it('tree is hidden before expand', () => {
    (usePaths as jest.Mock).mockReturnValue({ data: [mockActiveEnrollment] });
    render(<ProgressScreen />);
    expect(screen.queryByTestId('mock-track-tree')).toBeNull();
  });

  it('tree appears after pressing expand toggle', () => {
    (useTrackContents as jest.Mock).mockReturnValue({ data: mockContents, isLoading: false });
    (usePaths as jest.Mock).mockReturnValue({ data: [mockActiveEnrollment] });
    render(<ProgressScreen />);
    fireEvent.press(screen.getByTestId('path-expand-btn-skill-1'));
    expect(screen.getByTestId('mock-track-tree')).toBeTruthy();
  });

  it('tree hides again after toggling twice', () => {
    (useTrackContents as jest.Mock).mockReturnValue({ data: mockContents, isLoading: false });
    (usePaths as jest.Mock).mockReturnValue({ data: [mockActiveEnrollment] });
    render(<ProgressScreen />);
    fireEvent.press(screen.getByTestId('path-expand-btn-skill-1'));
    fireEvent.press(screen.getByTestId('path-expand-btn-skill-1'));
    expect(screen.queryByTestId('mock-track-tree')).toBeNull();
  });

  it('useTrackContents is called with enabled=false on mount (lazy fetch)', () => {
    (usePaths as jest.Mock).mockReturnValue({ data: [mockActiveEnrollment] });
    render(<ProgressScreen />);
    const calls = (useTrackContents as jest.Mock).mock.calls;
    // All calls on mount should have enabled: false
    calls.forEach((call: unknown[]) => {
      const options = call[2] as { enabled?: boolean } | undefined;
      expect(options?.enabled).toBe(false);
    });
  });

  it('useTrackContents called with enabled=true after expand', () => {
    (usePaths as jest.Mock).mockReturnValue({ data: [mockActiveEnrollment] });
    render(<ProgressScreen />);
    fireEvent.press(screen.getByTestId('path-expand-btn-skill-1'));
    const calls = (useTrackContents as jest.Mock).mock.calls;
    const lastCall = calls[calls.length - 1];
    expect((lastCall[2] as { enabled?: boolean })?.enabled).toBe(true);
  });

  it('tree receives initialExpanded with current group and topic keys', () => {
    (useTrackContents as jest.Mock).mockReturnValue({ data: mockContents, isLoading: false });
    (usePaths as jest.Mock).mockReturnValue({ data: [mockActiveEnrollment] });
    render(<ProgressScreen />);
    fireEvent.press(screen.getByTestId('path-expand-btn-skill-1'));
    const tree = screen.getByTestId('mock-track-tree');
    // accessibilityLabel encodes: contentId|groupKey|topicKey
    expect(tree.props.accessibilityLabel).toBe('skill-1|beginner|topic-1');
  });

  it('tree receives no initialExpanded when path is 100% complete (no isCurrent)', () => {
    (useTrackContents as jest.Mock).mockReturnValue({ data: mockCompletedContents, isLoading: false });
    (usePaths as jest.Mock).mockReturnValue({ data: [mockCompletedEnrollment] });
    render(<ProgressScreen />);
    fireEvent.press(screen.getByTestId('path-expand-btn-skill-2'));
    const tree = screen.getByTestId('mock-track-tree');
    // No isCurrent → groupKey and topicKey both empty
    expect(tree.props.accessibilityLabel).toBe('skill-2||');
  });

  it('shows loading indicator when tree fetch is in flight', () => {
    (useTrackContents as jest.Mock).mockReturnValue({ data: undefined, isLoading: true });
    (usePaths as jest.Mock).mockReturnValue({ data: [mockActiveEnrollment] });
    render(<ProgressScreen />);
    fireEvent.press(screen.getByTestId('path-expand-btn-skill-1'));
    expect(screen.getByTestId('tree-loading-skill-1')).toBeTruthy();
    expect(screen.queryByTestId('mock-track-tree')).toBeNull();
  });

  it('expands separate cards independently (expanding one does not fetch others)', () => {
    const secondEnrollment = { ...mockActiveEnrollment, id: 'skill-3', name: 'CSS Basics' };
    (usePaths as jest.Mock).mockReturnValue({ data: [mockActiveEnrollment, secondEnrollment] });
    render(<ProgressScreen />);
    // Only expand the first card
    fireEvent.press(screen.getByTestId('path-expand-btn-skill-1'));
    // Check that useTrackContents for skill-3 is still called with enabled: false
    const calls = (useTrackContents as jest.Mock).mock.calls;
    const skill3Calls = calls.filter((c: unknown[]) => c[1] === 'skill-3');
    skill3Calls.forEach((call: unknown[]) => {
      expect((call[2] as { enabled?: boolean })?.enabled).toBe(false);
    });
  });
});

describe('ProgressScreen — 076e custom path progress bar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useProgress as jest.Mock).mockReturnValue({ data: undefined, isLoading: false, isError: false });
    (useXp as jest.Mock).mockReturnValue({ data: undefined });
    (useTrackContents as jest.Mock).mockReturnValue({ data: undefined, isLoading: false });
  });

  it('shows a progress bar on custom path card (levels empty)', () => {
    const customPath = {
      kind: 'custom' as const,
      id: 'plan-1',
      name: 'My Custom Path',
      description: null,
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
      id: 'plan-1',
      name: 'My Custom Path',
      description: null,
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
