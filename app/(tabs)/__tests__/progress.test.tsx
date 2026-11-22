import React from 'react';
import { ACCURACY_LABEL, accuracyTextOf, ALTITUDE_LOAD_ERROR, PATHS_LOAD_ERROR, PROGRESS_LOAD_ERROR, type AltitudeResponse } from '@learning/shared';
import { render, screen, fireEvent, within } from '@testing-library/react-native';
import ProgressScreen from '../progress';
import { usePrefetchNextScreens } from '@/hooks/usePrefetchNextScreens';
import { useProgress } from '@/hooks/useProgress';
import { usePaths } from '@/hooks/useTrack';
import { useAltitude } from '@/hooks/useAltitude';
import { TRACKS_ROUTE, altitudeRoute } from '@/lib/routes';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

jest.mock('@/hooks/useProgress', () => ({ useProgress: jest.fn() }));
jest.mock('@/hooks/useTrack', () => ({ usePaths: jest.fn() }));
jest.mock('@/hooks/usePrefetchNextScreens', () => ({ usePrefetchNextScreens: jest.fn() }));
jest.mock('@/hooks/useWeek', () => ({ useWeek: jest.fn(() => ({ data: undefined })) }));
jest.mock('@/hooks/useAltitude', () => ({ useAltitude: jest.fn() }));
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
  accuracy: 71,
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
  accuracy: null,
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
  accuracy: 78,
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
    (useAltitude as jest.Mock).mockReturnValue({ data: undefined });
  });

  it('renders without errors', () => {
    setMock();
    expect(() => render(<ProgressScreen />)).not.toThrow();
  });

  it('115f: loads the next screens\' data in the background for the enrolled paths', () => {
    setMock();
    (usePaths as jest.Mock).mockReturnValue({ data: [mockActiveEnrollment, mockCompletedEnrollment] });
    render(<ProgressScreen />);
    expect(usePrefetchNextScreens).toHaveBeenCalledWith('progress', [mockActiveEnrollment, mockCompletedEnrollment]);
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
    expect(screen.getByText(PROGRESS_LOAD_ERROR)).toBeTruthy();
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

  it('shows the accuracy with its label', () => {
    setMock({ data: mockStats });
    render(<ProgressScreen />);
    expect(within(screen.getByTestId('progress-stats')).getByText(accuracyTextOf(mockStats.accuracy))).toBeTruthy();
    expect(screen.getByText(ACCURACY_LABEL)).toBeTruthy();
  });

  it('shows n/a, never 0%, when there is no accuracy', () => {
    setMock({ data: { ...mockStats, accuracy: null } });
    render(<ProgressScreen />);
    expect(screen.getByText(accuracyTextOf(null))).toBeTruthy();
    expect(screen.queryByText(accuracyTextOf(0))).toBeNull();
  });

  it('096: no last-lesson date card', () => {
    setMock({ data: mockStats });
    render(<ProgressScreen />);
    expect(screen.queryByText(/Last lesson/i)).toBeNull();
  });

  it('096: the three numbers are one quiet row, with no boxes', () => {
    setMock({ data: mockStats });
    render(<ProgressScreen />);
    const row = within(screen.getByTestId('progress-stats'));
    expect(row.getByTestId('progress-lessons-count')).toBeTruthy();
    expect(row.getByTestId('progress-accuracy')).toBeTruthy();
    expect(row.getByTestId('progress-streak')).toBeTruthy();
    expect(row.getByText(ACCURACY_LABEL)).toBeTruthy();
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
    (useAltitude as jest.Mock).mockReturnValue({ data: undefined });
  });

  it('shows active enrollment card with the track name, no percentage', () => {
    (usePaths as jest.Mock).mockReturnValue({ data: [mockActiveEnrollment] });
    render(<ProgressScreen />);
    expect(screen.getByText('JavaScript Fundamentals')).toBeTruthy();
    expect(screen.queryByText('30% complete')).toBeNull();
  });

  it('shows lessons count on active enrollment card', () => {
    (usePaths as jest.Mock).mockReturnValue({ data: [mockActiveEnrollment] });
    render(<ProgressScreen />);
    expect(screen.getByText(/3 of 10 lessons/)).toBeTruthy();
  });

  it('096: no motivation line that repeats the path name; the next lesson shows instead', () => {
    (usePaths as jest.Mock).mockReturnValue({
      data: [{ ...mockActiveEnrollment, nextLesson: { id: 'l9', title: 'Closures', skillPath: { level: 'beginner' }, topicName: 'Functions', lessonIndex: 4, totalLessons: 10 } }],
    });
    render(<ProgressScreen />);
    expect(screen.queryByText(/Only 7 lessons to complete|keep going/i)).toBeNull();
    expect(screen.getByTestId('path-next-lesson-' + mockActiveEnrollment.id).props.children).toContain('Closures');
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

  it("shows the path's accuracy on a completed track card, not the capstone or the average", () => {
    (usePaths as jest.Mock).mockReturnValue({ data: [mockCompletedEnrollment] });
    render(<ProgressScreen />);
    expect(screen.getByText(accuracyTextOf(mockCompletedEnrollment.accuracy))).toBeTruthy();
  });

  it('shows n/a on a completed track card with no accuracy', () => {
    (usePaths as jest.Mock).mockReturnValue({
      data: [{ ...mockCompletedEnrollment, accuracy: null }],
    });
    render(<ProgressScreen />);
    expect(within(screen.getByTestId(`completed-card-${mockCompletedEnrollment.id}`)).getByText(accuracyTextOf(null))).toBeTruthy();
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

  it('heads several paths in progress "Your paths"', () => {
    (usePaths as jest.Mock).mockReturnValue({
      data: [mockActiveEnrollment, { ...mockActiveEnrollment, id: 'other' }],
    });
    render(<ProgressScreen />);
    expect(screen.getByText('Your paths')).toBeTruthy();
    expect(screen.queryByText('Your path')).toBeNull();
  });

  it('shows both active and completed sections when both present', () => {
    (usePaths as jest.Mock).mockReturnValue({
      data: [mockActiveEnrollment, mockCompletedEnrollment],
    });
    render(<ProgressScreen />);
    expect(screen.getByText('Your path')).toBeTruthy();
    expect(screen.getByText('Completed')).toBeTruthy();
  });

  it('shows no "pick a track" box when there are no paths: the medals stand on their own', () => {
    (usePaths as jest.Mock).mockReturnValue({ data: [] });
    render(<ProgressScreen />);
    expect(screen.queryByTestId('no-track-notice')).toBeNull();
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
    (useAltitude as jest.Mock).mockReturnValue({ data: undefined });
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

describe('ProgressScreen — altitude block (118ad)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (usePaths as jest.Mock).mockReturnValue({ data: undefined });
    setMock({ data: mockStats });
  });

  const altitude: AltitudeResponse = {
    metres: 1_120,
    level: 10,
    nextLevel: { level: 11, startsAt: 1_270, metresToGo: 150 },
    lessonsToNextLevel: 5,
    nextLandmark: null,
    newLandmark: null,
  };

  it('opens the Height Chart on the Level view when the Altitude header is tapped', () => {
    setMock({ data: mockStats });
    (useAltitude as jest.Mock).mockReturnValue({ data: altitude });
    render(<ProgressScreen />);
    fireEvent.press(screen.getByTestId('altitude-block'));
    expect(mockPush).toHaveBeenCalledWith(altitudeRoute('level'));
  });

  it('shows the level, the metres, the bar and the lessons to the next level', () => {
    (useAltitude as jest.Mock).mockReturnValue({ data: altitude });
    render(<ProgressScreen />);
    const block = within(screen.getByTestId('altitude-block'));
    expect(block.getByText('Level 10')).toBeTruthy();
    expect(block.getByText('1,120m')).toBeTruthy();
    expect(block.getByText('About 5 lessons to Level 11')).toBeTruthy();
    expect(screen.getByTestId('altitude-bar')).toBeTruthy();
  });

  it('shows no caption when the lessons to the next level are null', () => {
    (useAltitude as jest.Mock).mockReturnValue({ data: { ...altitude, lessonsToNextLevel: null } });
    render(<ProgressScreen />);
    expect(screen.getByText('Level 10')).toBeTruthy();
    expect(screen.queryByTestId('altitude-caption')).toBeNull();
  });

  it('shows no mini trail', () => {
    (useAltitude as jest.Mock).mockReturnValue({ data: altitude });
    render(<ProgressScreen />);
    expect(screen.queryByLabelText(/^Level \d of 5$/)).toBeNull();
  });

  it('says the altitude could not be loaded, in place of the block, even over an older reading', () => {
    (useAltitude as jest.Mock).mockReturnValue({ data: altitude, isError: true });
    render(<ProgressScreen />);
    expect(screen.getByText(ALTITUDE_LOAD_ERROR)).toBeTruthy();
    expect(screen.queryByTestId('altitude-block')).toBeNull();
  });

  it('hides the block until altitude has loaded', () => {
    (useAltitude as jest.Mock).mockReturnValue({ data: undefined });
    render(<ProgressScreen />);
    expect(screen.queryByTestId('altitude-block')).toBeNull();
  });
});

describe('ProgressScreen — Ticket 072j safe-area edges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedEdges = undefined;
    (useProgress as jest.Mock).mockReturnValue({ data: undefined, isLoading: false, isError: false });
    (usePaths as jest.Mock).mockReturnValue({ data: undefined });
    (useAltitude as jest.Mock).mockReturnValue({ data: undefined });
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
    (useAltitude as jest.Mock).mockReturnValue({ data: undefined });
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
    (useAltitude as jest.Mock).mockReturnValue({ data: undefined });
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
      accuracy: null,
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
      accuracy: null,
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
