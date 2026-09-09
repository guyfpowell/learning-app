import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import ProfileScreen from '../profile';
import { useAuthStore } from '@/store/auth.store';
import { useLogout } from '@/hooks/useAuth';
import { useProgress } from '@/hooks/useProgress';
import { useEnrollments } from '@/hooks/useTrack';
import { useSavedLessons } from '@/hooks/useLesson';
import { useAchievements } from '@/hooks/useAchievements';

jest.mock('@/store/auth.store', () => ({ useAuthStore: jest.fn() }));
jest.mock('@/hooks/useAuth', () => ({ useLogout: jest.fn() }));
jest.mock('@/hooks/useProgress', () => ({ useProgress: jest.fn() }));
jest.mock('@/hooks/useTrack', () => ({ useEnrollments: jest.fn() }));
jest.mock('@/hooks/useLesson', () => ({ useSavedLessons: jest.fn() }));
jest.mock('@/hooks/useAchievements', () => ({ useAchievements: jest.fn() }));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const mockUser = { id: 'u1', email: 'user@example.com', name: 'Test User' };
const mockMutate = jest.fn();

const mockProgress = {
  totalLessonsCompleted: 42,
  currentStreak: 7,
  averageScore: 83.33,
  lastLessonDate: '2026-09-09T10:00:00Z',
};

const mockActiveEnrollment = {
  id: 'e1',
  skillId: 's1',
  skill: { id: 's1', name: 'Product Strategy', slug: 'product-strategy' },
  percentComplete: 62,
  completedLessons: 31,
  totalLessons: 50,
  isActive: true,
  enrolledAt: '2026-08-01T00:00:00Z',
  levels: [],
};

const mockSavedLesson = {
  id: 'l1',
  title: 'User Research Fundamentals',
  topicName: 'Research Methods',
  skillName: 'Discovery',
  lessonNumber: 3,
  savedAt: '2026-09-01T12:00:00Z',
};

const mockAchievementsResponse = {
  unlocked: [
    { key: 'first-light', name: 'First Light', description: 'Completed your first lesson', axis: 'milestone', unlockedAt: '2026-08-01T00:00:00Z' },
    { key: 'signed-on',   name: 'Signed On',   description: 'Chose your first track',       axis: 'milestone', unlockedAt: '2026-08-01T00:00:00Z' },
  ],
  locked: [
    { key: 'good-innings', name: 'Good Innings', description: 'Completed 8 lessons in one sitting', axis: 'session' },
    { key: 'clean-sheet',  name: 'Clean Sheet',  description: 'Got 10 quizzes right first time',    axis: 'accuracy' },
  ],
  totalUnlocked: 2,
  totalAvailable: 30,
};

// ── Setup helpers ─────────────────────────────────────────────────────────────

function setDefaults() {
  (useAuthStore as unknown as jest.Mock).mockReturnValue(mockUser);
  (useLogout as jest.Mock).mockReturnValue({ mutate: mockMutate, isPending: false });
  (useProgress as jest.Mock).mockReturnValue({ data: mockProgress, isLoading: false, isError: false });
  (useEnrollments as jest.Mock).mockReturnValue({ data: [mockActiveEnrollment] });
  (useSavedLessons as jest.Mock).mockReturnValue({ data: [mockSavedLesson] });
  (useAchievements as jest.Mock).mockReturnValue({ data: mockAchievementsResponse, isLoading: false });
}

// ─────────────────────────────────────────────────────────────────────────────

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setDefaults();
  });

  it('renders without errors', () => {
    expect(() => render(<ProfileScreen />)).not.toThrow();
  });

  // ── Avatar + header ─────────────────────────────────────────────────────────

  it('shows user name', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('Test User')).toBeTruthy();
  });

  it('shows user email', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('user@example.com')).toBeTruthy();
  });

  it('shows avatar initials derived from the name', () => {
    render(<ProfileScreen />);
    // "Test User" → "TU"
    expect(screen.getByTestId('avatar-initials')).toBeTruthy();
    expect(screen.getByText('TU')).toBeTruthy();
  });

  // ── Stat tiles ──────────────────────────────────────────────────────────────

  it('shows streak stat', () => {
    render(<ProfileScreen />);
    expect(screen.getByTestId('profile-streak')).toBeTruthy();
    expect(screen.getByText('7')).toBeTruthy();
  });

  it('shows lessons completed stat', () => {
    render(<ProfileScreen />);
    expect(screen.getByTestId('profile-lessons')).toBeTruthy();
    expect(screen.getByText('42')).toBeTruthy();
  });

  it('shows badge count stat', () => {
    render(<ProfileScreen />);
    expect(screen.getByTestId('profile-badge-count')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy(); // totalUnlocked from mockAchievementsResponse
  });

  // ── Achievements grid ───────────────────────────────────────────────────────

  it('shows the Achievements section heading', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('Achievements')).toBeTruthy();
  });

  it('renders unlocked achievement names', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('First Light')).toBeTruthy();
    expect(screen.getByText('Signed On')).toBeTruthy();
  });

  it('renders locked achievement names', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('Good Innings')).toBeTruthy();
    expect(screen.getByText('Clean Sheet')).toBeTruthy();
  });

  it('unlocked achievement cards have full opacity', () => {
    render(<ProfileScreen />);
    const card = screen.getByTestId('achievement-first-light');
    expect(card.props.style).toEqual(expect.arrayContaining([
      expect.objectContaining({ opacity: 1 }),
    ]));
  });

  it('locked achievement cards have reduced opacity', () => {
    render(<ProfileScreen />);
    const card = screen.getByTestId('achievement-good-innings');
    expect(card.props.style).toEqual(expect.arrayContaining([
      expect.objectContaining({ opacity: 0.45 }),
    ]));
  });

  // ── Saved lessons ───────────────────────────────────────────────────────────

  it('shows saved lessons section heading', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('Saved')).toBeTruthy();
  });

  it('renders a saved lesson title', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('User Research Fundamentals')).toBeTruthy();
  });

  it('navigates to the lesson on saved lesson tap', () => {
    const push = jest.fn();
    jest.spyOn(require('expo-router'), 'useRouter').mockReturnValue({ push, replace: jest.fn(), back: jest.fn() });
    render(<ProfileScreen />);
    fireEvent.press(screen.getByTestId('saved-lesson-l1'));
    expect(push).toHaveBeenCalledWith('/(tabs)/lesson/l1');
  });

  it('shows empty state when no saved lessons', () => {
    (useSavedLessons as jest.Mock).mockReturnValue({ data: [] });
    render(<ProfileScreen />);
    expect(screen.getByTestId('saved-empty')).toBeTruthy();
  });

  // ── Track progress ──────────────────────────────────────────────────────────

  it('shows track progress section heading', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('Track progress')).toBeTruthy();
  });

  it('shows enrollment skill name in track progress', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('Product Strategy')).toBeTruthy();
  });

  it('shows no enrollments empty state when no tracks', () => {
    (useEnrollments as jest.Mock).mockReturnValue({ data: [] });
    render(<ProfileScreen />);
    expect(screen.getByTestId('profile-no-tracks')).toBeTruthy();
  });

  // ── Log out ─────────────────────────────────────────────────────────────────

  it('shows logout button', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('LOG OUT')).toBeTruthy();
  });

  it('calls logout mutate on button press', () => {
    render(<ProfileScreen />);
    fireEvent.press(screen.getByText('LOG OUT'));
    expect(mockMutate).toHaveBeenCalledTimes(1);
  });

  // ── Loading / null states ────────────────────────────────────────────────────

  it('handles null progress gracefully', () => {
    (useProgress as jest.Mock).mockReturnValue({ data: null, isLoading: false, isError: false });
    expect(() => render(<ProfileScreen />)).not.toThrow();
  });

  it('handles undefined achievements gracefully', () => {
    (useAchievements as jest.Mock).mockReturnValue({ data: undefined, isLoading: true });
    expect(() => render(<ProfileScreen />)).not.toThrow();
  });
});
