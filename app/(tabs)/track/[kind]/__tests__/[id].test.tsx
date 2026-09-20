import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import TrackDetailScreen from '../[id]';
import { useTrackContents, usePaths, useEnroll } from '@/hooks/useTrack';
import type { TrackContents, UserPath } from '@learning/shared';

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter:           () => ({ push: mockPush, back: mockBack }),
  useLocalSearchParams: () => ({ kind: 'track', id: 'skill-1' }),
}));

jest.mock('@/hooks/useTrack', () => ({
  useTrackContents: jest.fn(),
  usePaths:         jest.fn(),
  useEnroll:        jest.fn(),
}));

// Stub the tree — its own tests cover it; here we just confirm it renders.
jest.mock('@/components/learning/TrackContentsTree', () => ({
  TrackContentsTree: ({ contents }: { contents: TrackContents }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID="track-contents-tree">
        <Text testID="tree-kind">{contents.kind}</Text>
      </View>
    );
  },
}));

jest.mock('@/components/ui/PremiumModal', () => ({
  PremiumModal: ({ visible }: { visible: boolean }) => {
    const { View } = require('react-native');
    return visible ? <View testID="premium-modal" /> : null;
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync:    jest.fn(() => Promise.resolve(null)),
  setItemAsync:    jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

const mockContents: TrackContents = {
  kind:     'track',
  id:       'skill-1',
  name:     'Product Strategy',
  enrolled: true,
  groups:   [],
};

const mockPath: UserPath = {
  kind:             'track',
  id:               'skill-1',
  name:             'Product Strategy',
  enrolledAt:       '2026-01-01T00:00:00Z',
  completedAt:      null,
  skill:            {} as never,
  totalLessons:     10,
  completedLessons: 3,
  percentComplete:  30,
  nextLesson:       null,
  levels:           [],
  upgradeRequired:  false,
  isActive:         true,
  canSkipTopic:     false,
  canSkipLevel:     false,
  averageScore:     null,
  capstoneScore:    null,
};

const mockEnroll = { mutate: jest.fn(), isPending: false };

function setMocks({
  contents       = mockContents as TrackContents | undefined,
  contentsLoading = false,
  contentsError   = false,
  paths           = [mockPath] as UserPath[],
  pathsLoading    = false,
  enroll          = mockEnroll,
} = {}) {
  (useTrackContents as jest.Mock).mockReturnValue({
    data: contents, isLoading: contentsLoading, isError: contentsError, error: null,
  });
  (usePaths as jest.Mock).mockReturnValue({ data: paths, isLoading: pathsLoading });
  (useEnroll as jest.Mock).mockReturnValue(enroll);
}

describe('TrackDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMocks();
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  it('renders the track name as heading', () => {
    render(<TrackDetailScreen />);
    expect(screen.getByText('Product Strategy')).toBeTruthy();
  });

  it('renders the TrackContentsTree with contents', () => {
    render(<TrackDetailScreen />);
    expect(screen.getByTestId('track-contents-tree')).toBeTruthy();
    expect(screen.getByTestId('tree-kind')).toBeTruthy();
  });

  it('shows overall progress', () => {
    render(<TrackDetailScreen />);
    expect(screen.getByTestId('track-detail-progress')).toBeTruthy();
  });

  // ── Loading and error ──────────────────────────────────────────────────────

  it('shows loading spinner while contents are loading', () => {
    setMocks({ contentsLoading: true });
    render(<TrackDetailScreen />);
    expect(screen.getByTestId('track-detail-loading')).toBeTruthy();
  });

  it('shows error message when contents fail to load', () => {
    setMocks({ contentsError: true, contents: undefined });
    render(<TrackDetailScreen />);
    expect(screen.getByTestId('track-detail-error')).toBeTruthy();
  });

  // ── Primary action — enrolled with next lesson ─────────────────────────────

  const nextLessonBase = {
    id: 'lesson-1', skillPathId: 'sp-1', title: 'Test', content: 'x',
    durationMinutes: 5, difficulty: 'beginner' as const, lessonNumber: 1, isTeaser: false,
    createdAt: new Date(), updatedAt: new Date(),
  };

  it('shows Start lesson when nextLesson.resumePhase is null', () => {
    const pathWithLesson: UserPath = {
      ...mockPath,
      nextLesson: { ...nextLessonBase, resumePhase: null },
    };
    setMocks({ paths: [pathWithLesson] });
    render(<TrackDetailScreen />);
    // Button renders label.toUpperCase()
    expect(screen.getByText('START LESSON')).toBeTruthy();
  });

  it('shows Continue lesson when nextLesson.resumePhase is set', () => {
    const pathWithLesson: UserPath = {
      ...mockPath,
      nextLesson: { ...nextLessonBase, resumePhase: 'expanded' },
    };
    setMocks({ paths: [pathWithLesson] });
    render(<TrackDetailScreen />);
    expect(screen.getByText('CONTINUE LESSON')).toBeTruthy();
  });

  it('navigates to lesson screen when Start lesson is tapped', () => {
    const pathWithLesson: UserPath = {
      ...mockPath,
      nextLesson: { ...nextLessonBase, resumePhase: null },
    };
    setMocks({ paths: [pathWithLesson] });
    render(<TrackDetailScreen />);
    fireEvent.press(screen.getByTestId('track-detail-start-btn'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/lesson/lesson-1');
  });

  // ── Primary action — not enrolled ─────────────────────────────────────────

  it('shows Enrol button when not enrolled', () => {
    setMocks({ contents: { ...mockContents, enrolled: false }, paths: [] });
    render(<TrackDetailScreen />);
    expect(screen.getByTestId('track-detail-enrol-btn')).toBeTruthy();
  });

  it('calls enroll mutation when Enrol is tapped', () => {
    const enroll = { mutate: jest.fn(), isPending: false };
    setMocks({ contents: { ...mockContents, enrolled: false }, paths: [], enroll });
    render(<TrackDetailScreen />);
    fireEvent.press(screen.getByTestId('track-detail-enrol-btn'));
    expect(enroll.mutate).toHaveBeenCalledWith('skill-1', expect.any(Object));
  });

  // ── Back navigation ────────────────────────────────────────────────────────

  it('navigates back when back button is pressed', () => {
    render(<TrackDetailScreen />);
    fireEvent.press(screen.getByTestId('track-detail-back'));
    expect(mockBack).toHaveBeenCalled();
  });
});
