import React from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react-native';
import TrackDetailScreen from '../[id]';
import { useTrackContents, usePaths, useEnroll } from '@/hooks/useTrack';
import { useUpdateTrackPlan } from '@/hooks/useTrackBuilder';
import { trackRoute } from '@/lib/routes';
import type { TrackContents, UserPath } from '@learning/shared';

const mockPush = jest.fn();
let mockParams: Record<string, string> = { kind: 'track', id: 'skill-1' };
jest.mock('expo-router', () => ({
  Stack:               { Screen: () => null },
  useRouter:           () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams,
}));

jest.mock('@/hooks/useTrack', () => ({
  useTrackContents: jest.fn(),
  usePaths:         jest.fn(),
  useEnroll:        jest.fn(),
}));

jest.mock('@/hooks/useTrackBuilder', () => ({
  useUpdateTrackPlan: jest.fn(),
}));

jest.mock('@/hooks/useLesson', () => ({
  useLesson: () => ({ data: { id: 'l-2', summary: 'What the PM owns in a launch.' }, isLoading: false, isError: false }),
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
  topicEnd:         null,
  id:               'skill-1',
  name:             'Product Strategy',
  description:      null,
  enrolledAt:       '2026-01-01T00:00:00Z',
  completedAt:      null,
  skill:            {
    id: 'skill-1', trackId: 1, name: 'Product Strategy', description: '', headline: '', detail: null, category: 'strategy', order: 1,
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  },
  totalLessons:     10,
  completedLessons: 3,
  percentComplete:  30,
  nextLesson:       null,
  levels:           [],
  isActive:         true,
  canSkipLesson:    false,
  canSkipTopic:     false,
  canSkipLevel:     false,
  averageScore:     null,
  capstoneScore:    null,
};

const mockEnroll = { mutate: jest.fn(), isPending: false };
const mockUpdatePlan = { mutateAsync: jest.fn() };

const doneLesson = { id: 'l-1', title: 'Done lesson', lessonNumber: 1, status: 'complete' as const, locked: false };
const nextLesson = { id: 'l-2', title: 'Next lesson', lessonNumber: 2, status: 'not-started' as const, locked: false };

function withGroups(): TrackContents {
  return {
    ...mockContents,
    groups: [{
      key: 'beginner', label: 'beginner', completedLessons: 1, totalLessons: 2, isCurrent: true,
      topics: [{ key: 'topic-1', name: 'Introduction', completedLessons: 1, totalLessons: 2, isCurrent: true, unresolved: false, lessons: [doneLesson, nextLesson] }],
    }],
  };
}

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
  (useUpdateTrackPlan as jest.Mock).mockReturnValue(mockUpdatePlan);
}

describe('TrackDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = { kind: 'track', id: 'skill-1' };
    mockUpdatePlan.mutateAsync.mockResolvedValue({});
    setMocks();
  });

  // ── Rename ─────────────────────────────────────────────────────────────────

  it('lets the learner rename their own (custom) path by tapping its name', async () => {
    mockParams = { kind: 'custom', id: 'plan-1' };
    setMocks({ contents: { ...mockContents, kind: 'custom', id: 'plan-1', name: 'Head of refresher' } });
    render(<TrackDetailScreen />);
    fireEvent.press(screen.getByTestId('track-detail-heading'));
    fireEvent.changeText(screen.getByTestId('rename-input'), 'Director path');
    await act(async () => { fireEvent(screen.getByTestId('rename-input'), 'submitEditing'); });
    expect(mockUpdatePlan.mutateAsync).toHaveBeenCalledWith({ id: 'plan-1', name: 'Director path' });
  });

  it('leaves a curated track\'s name alone: tapping it does nothing', () => {
    render(<TrackDetailScreen />);
    fireEvent.press(screen.getByTestId('track-detail-heading'));
    expect(screen.queryByTestId('rename-input')).toBeNull();
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  it('renders the track name as heading', () => {
    render(<TrackDetailScreen />);
    expect(screen.getByText('Product Strategy')).toBeTruthy();
  });

  it('lists the levels, with no topics or lessons on the same page', () => {
    setMocks({ contents: withGroups() });
    render(<TrackDetailScreen />);
    expect(screen.getByText('Beginner')).toBeTruthy();
    expect(screen.queryByText('Introduction')).toBeNull();
    expect(screen.queryByText('Done lesson')).toBeNull();
  });

  // ── One step at a time ─────────────────────────────────────────────────────

  it('opens a level as its own page when it is tapped', () => {
    setMocks({ contents: withGroups() });
    render(<TrackDetailScreen />);
    fireEvent.press(screen.getByTestId('group-row-beginner'));
    expect(mockPush).toHaveBeenCalledWith(trackRoute('track', 'skill-1', { group: 'beginner' }));
  });

  it('shows a level\'s topics, under the level\'s name and without the path\'s progress', () => {
    mockParams = { kind: 'track', id: 'skill-1', group: 'beginner' };
    setMocks({ contents: withGroups() });
    render(<TrackDetailScreen />);
    expect(screen.getByTestId('track-detail-subheading').props.children).toBe('Beginner');
    expect(screen.getByText('Introduction')).toBeTruthy();
    expect(screen.queryByTestId('track-detail-progress')).toBeNull();
  });

  it('shows a topic\'s lessons', () => {
    mockParams = { kind: 'track', id: 'skill-1', group: 'beginner', topic: 'topic-1' };
    setMocks({ contents: withGroups() });
    render(<TrackDetailScreen />);
    expect(screen.getByTestId('track-detail-subheading').props.children).toBe('Introduction');
    expect(screen.getByText('Done lesson')).toBeTruthy();
    expect(screen.getByText('Next lesson')).toBeTruthy();
  });

  it('opens a completed lesson itself', () => {
    mockParams = { kind: 'track', id: 'skill-1', group: 'beginner', topic: 'topic-1' };
    setMocks({ contents: withGroups() });
    render(<TrackDetailScreen />);
    fireEvent.press(screen.getByTestId('lesson-row-l-1'));
    expect(mockPush).toHaveBeenCalledWith('/lesson/l-1');
  });

  it('opens the upgrade, not the lesson, for a completed lesson that is locked', () => {
    mockParams = { kind: 'track', id: 'skill-1', group: 'beginner', topic: 'topic-1' };
    const base = withGroups();
    const gated: TrackContents = {
      ...base,
      groups: base.groups.map((g) => ({
        ...g,
        topics: g.topics.map((t) => ({ ...t, lessons: t.lessons.map((l) => (l.id === 'l-1' ? { ...l, locked: true } : l)) })),
      })),
    };
    setMocks({ contents: gated });
    render(<TrackDetailScreen />);
    fireEvent.press(screen.getByTestId('lesson-row-l-1'));
    expect(screen.getByTestId('premium-modal')).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('opens the summary page for a lesson not yet done, and never the lesson', () => {
    mockParams = { kind: 'track', id: 'skill-1', group: 'beginner', topic: 'topic-1' };
    setMocks({ contents: withGroups() });
    render(<TrackDetailScreen />);
    fireEvent.press(screen.getByTestId('lesson-row-l-2'));
    expect(mockPush).toHaveBeenCalledWith(trackRoute('track', 'skill-1', { group: 'beginner', topic: 'topic-1', lesson: 'l-2' }));
  });

  it('shows a lesson\'s summary, with nothing to start it', () => {
    mockParams = { kind: 'track', id: 'skill-1', group: 'beginner', topic: 'topic-1', lesson: 'l-2' };
    setMocks({ contents: withGroups() });
    render(<TrackDetailScreen />);
    expect(screen.getByTestId('track-detail-subheading').props.children).toBe('Next lesson');
    expect(screen.getByText('What the PM owns in a launch.')).toBeTruthy();
    expect(screen.queryByText(/start lesson|continue lesson/i)).toBeNull();
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

  // ── No primary action when enrolled ────────────────────────────────────────

  it('has no Start or Continue lesson button: the page is for looking over the path', () => {
    render(<TrackDetailScreen />);
    expect(screen.queryByTestId('track-detail-start-btn')).toBeNull();
    expect(screen.queryByText(/start lesson|continue lesson/i)).toBeNull();
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
});
