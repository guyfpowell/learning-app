import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import ProfileScreen from '../profile';
import { useAuthStore } from '@/store/auth.store';
import { useLogout } from '@/hooks/useAuth';
import { useSavedLessons } from '@/hooks/useLesson';

jest.mock('@/store/auth.store', () => ({ useAuthStore: jest.fn() }));
jest.mock('@/hooks/useAuth', () => ({
  useLogout: jest.fn(),
  useDeleteAccount: jest.fn(() => ({ mutate: jest.fn(), isPending: false, isError: false, error: null, reset: jest.fn() })),
  useDeleteAccountPreflight: jest.fn(() => ({ data: { teamOwnerships: [] }, isLoading: false })),
}));
jest.mock('@/hooks/useLesson', () => ({ useSavedLessons: jest.fn() }));
jest.mock('@/hooks/useNotificationPrefs', () => ({
  useNotificationPreferences: jest.fn(() => ({ data: undefined, isLoading: false })),
  useUpdateNotificationPreferences: jest.fn(() => ({ mutate: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
}));
jest.mock('@/hooks/useProfile', () => ({
  useProfile: jest.fn(() => ({ data: undefined })),
  useUpdateProfile: jest.fn(() => ({ mutate: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
}));
jest.mock('@/hooks/usePushStatus', () => ({ usePushStatus: jest.fn(() => ({ permissionStatus: 'granted', register: jest.fn() })) }));

let capturedEdges: string[] | undefined;
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, edges }: { children: React.ReactNode; edges?: string[] }) => {
    capturedEdges = edges;
    return <>{children}</>;
  },
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


const mockSavedLesson = {
  id: 'l1',
  title: 'User Research Fundamentals',
  topicName: 'Research Methods',
  skillName: 'Discovery',
  lessonNumber: 3,
  savedAt: '2026-09-01T12:00:00Z',
};

// ── Setup helpers ─────────────────────────────────────────────────────────────

function setDefaults() {
  jest.mocked(useAuthStore).mockReturnValue(mockUser);
  (useLogout as jest.Mock).mockReturnValue({ mutate: mockMutate, isPending: false });
  (useSavedLessons as jest.Mock).mockReturnValue({ data: [mockSavedLesson] });
}

// ─────────────────────────────────────────────────────────────────────────────

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedEdges = undefined;
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

  // ── Moved to Progress (096): Profile is a profile page ─────────────────────

  it('has no stats, achievements or track progress: those live on Progress', () => {
    render(<ProfileScreen />);
    expect(screen.queryByTestId('profile-streak')).toBeNull();
    expect(screen.queryByTestId('profile-lessons')).toBeNull();
    expect(screen.queryByText('Achievements')).toBeNull();
    expect(screen.queryByText('Track progress')).toBeNull();
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
    expect(push).toHaveBeenCalledWith('/lesson/l1');
  });

  it('shows empty state when no saved lessons', () => {
    (useSavedLessons as jest.Mock).mockReturnValue({ data: [] });
    render(<ProfileScreen />);
    expect(screen.getByTestId('saved-empty')).toBeTruthy();
  });

  // ── Log out ─────────────────────────────────────────────────────────────────

  it('shows logout button', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('Log out')).toBeTruthy();
  });

  it('calls logout mutate on button press', () => {
    render(<ProfileScreen />);
    fireEvent.press(screen.getByText('Log out'));
    expect(mockMutate).toHaveBeenCalledTimes(1);
  });

  describe('Ticket 072j — safe-area edges', () => {
    it('uses edges=[left,right] so the tab layout owns the top inset and the tab bar the bottom one (090)', () => {
      render(<ProfileScreen />);
      expect(capturedEdges).toEqual(['left', 'right']);
    });
  });
});
