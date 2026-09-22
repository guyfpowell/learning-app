import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import ProfileScreen from '../profile';
import { useAuthStore } from '@/store/auth.store';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/hooks/useNotificationPrefs';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { usePushStatus } from '@/hooks/usePushStatus';
import { useLogout } from '@/hooks/useAuth';
import { useProgress } from '@/hooks/useProgress';
import { usePaths } from '@/hooks/useTrack';
import { useSavedLessons } from '@/hooks/useLesson';
import { useAchievements } from '@/hooks/useAchievements';
import type { NotificationPreference } from '@learning/shared';

jest.mock('@/store/auth.store', () => ({ useAuthStore: jest.fn() }));
jest.mock('@/hooks/useNotificationPrefs', () => ({
  useNotificationPreferences: jest.fn(),
  useUpdateNotificationPreferences: jest.fn(),
}));
jest.mock('@/hooks/useProfile', () => ({
  useProfile: jest.fn(),
  useUpdateProfile: jest.fn(),
}));
jest.mock('@/hooks/usePushStatus', () => ({ usePushStatus: jest.fn() }));
jest.mock('@/hooks/useAuth', () => ({
  useLogout: jest.fn(),
  useDeleteAccount: jest.fn(() => ({ mutate: jest.fn(), isPending: false, isError: false, error: null, reset: jest.fn() })),
  useDeleteAccountPreflight: jest.fn(() => ({ data: { teamOwnerships: [] }, isLoading: false })),
}));
jest.mock('@/hooks/useProgress', () => ({ useProgress: jest.fn() }));
jest.mock('@/hooks/useTrack', () => ({ usePaths: jest.fn() }));
jest.mock('@/hooks/useLesson', () => ({ useSavedLessons: jest.fn() }));
jest.mock('@/hooks/useAchievements', () => ({ useAchievements: jest.fn() }));
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }) }));

let capturedEdges: string[] | undefined;
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, edges }: { children: React.ReactNode; edges?: string[] }) => {
    capturedEdges = edges;
    return <>{children}</>;
  },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// ─── Intl timezone mock ───────────────────────────────────────────────────────

beforeAll(() => {
  jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => ({
    resolvedOptions: () => ({ timeZone: 'UTC' }),
    format: jest.fn(),
    formatToParts: jest.fn(),
    formatRange: jest.fn(),
    formatRangeToParts: jest.fn(),
  }) as unknown as Intl.DateTimeFormat);
});

afterAll(() => {
  jest.restoreAllMocks();
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockUser = { id: 'u1', email: 'user@example.com', name: 'Test User' };

const mockPrefs: NotificationPreference = {
  id: 'np1',
  userId: 'u1',
  enableDailyReminder: false,
  reminderTime: 'morning',
  enableStreak: true,
  enableLessonAvailable: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockMutate = jest.fn();
const mockProfileMutate = jest.fn();
const mockRegister = jest.fn();

function setPushStatusMock(permissionStatus: 'granted' | 'denied' | 'undetermined' = 'granted') {
  (usePushStatus as jest.Mock).mockReturnValue({ permissionStatus, register: mockRegister });
}

function setQueryMock(overrides: Record<string, unknown> = {}) {
  (useNotificationPreferences as jest.Mock).mockReturnValue({
    data: mockPrefs,
    isLoading: false,
    isError: false,
    ...overrides,
  });
}

function setMutationMock(overrides: Record<string, unknown> = {}) {
  (useUpdateNotificationPreferences as jest.Mock).mockReturnValue({
    mutate: mockMutate,
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
    ...overrides,
  });
}

function setProfileQueryMock(overrides: Record<string, unknown> = {}) {
  (useProfile as jest.Mock).mockReturnValue({
    data: { preferredTime: '08:00' },
    isLoading: false,
    ...overrides,
  });
}

function setProfileMutationMock(overrides: Record<string, unknown> = {}) {
  (useUpdateProfile as jest.Mock).mockReturnValue({
    mutate: mockProfileMutate,
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
    ...overrides,
  });
}

describe('ProfileScreen — settings section (076b: folded in from the Settings tab)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedEdges = undefined;
    (useAuthStore as unknown as jest.Mock).mockReturnValue(mockUser);
    setQueryMock();
    setMutationMock();
    setProfileQueryMock();
    setProfileMutationMock();
    setPushStatusMock();
    (useLogout as jest.Mock).mockReturnValue({ mutate: jest.fn(), isPending: false });
    (useProgress as jest.Mock).mockReturnValue({ data: undefined });
    (usePaths as jest.Mock).mockReturnValue({ data: [] });
    (useSavedLessons as jest.Mock).mockReturnValue({ data: [] });
    (useAchievements as jest.Mock).mockReturnValue({ data: undefined, isLoading: false });
  });

  it('renders without errors', () => {
    expect(() => render(<ProfileScreen />)).not.toThrow();
  });

  it('shows Settings heading', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('Settings')).toBeTruthy();
  });

  it('shows spinner while loading preferences', () => {
    setQueryMock({ data: undefined, isLoading: true });
    render(<ProfileScreen />);
    expect(screen.getByTestId('prefs-loading')).toBeTruthy();
  });

  it('shows user name in profile section', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('Test User')).toBeTruthy();
  });

  it('shows user email in profile section', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('user@example.com')).toBeTruthy();
  });

  it('shows daily reminder label', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('Daily reminder')).toBeTruthy();
  });

  it('shows streak milestone label', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('Streak milestones')).toBeTruthy();
  });

  it('shows new lesson available label', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('New lesson available')).toBeTruthy();
  });

  it('hides the time picker when daily reminder is off', () => {
    setQueryMock({ data: { ...mockPrefs, enableDailyReminder: false } });
    render(<ProfileScreen />);
    expect(screen.queryByTestId('reminder-time-picker')).toBeNull();
  });

  it('shows the time picker when daily reminder is on', () => {
    setQueryMock({ data: { ...mockPrefs, enableDailyReminder: true } });
    render(<ProfileScreen />);
    expect(screen.getByTestId('reminder-time-picker')).toBeTruthy();
  });

  it('toggling daily reminder on reveals the time picker', () => {
    setQueryMock({ data: { ...mockPrefs, enableDailyReminder: false } });
    render(<ProfileScreen />);
    expect(screen.queryByTestId('reminder-time-picker')).toBeNull();
    fireEvent(screen.getByTestId('toggle-daily-reminder'), 'valueChange', true);
    expect(screen.getByTestId('reminder-time-picker')).toBeTruthy();
  });

  it('initialises the time picker from profile preferredTime', () => {
    setProfileQueryMock({ data: { preferredTime: '14:30' } });
    setQueryMock({ data: { ...mockPrefs, enableDailyReminder: true } });
    render(<ProfileScreen />);
    const picker = screen.getByTestId('reminder-time-picker');
    const value = new Date(picker.props.date);
    expect(value.getHours()).toBe(14);
    expect(value.getMinutes()).toBe(30);
  });

  describe('push notification status', () => {
    it('shows enabled state when permission is granted', () => {
      setPushStatusMock('granted');
      render(<ProfileScreen />);
      expect(screen.getByTestId('push-status-enabled')).toBeTruthy();
      expect(screen.getByText('Push notifications are enabled')).toBeTruthy();
    });

    it('shows blocked message when permission is denied', () => {
      setPushStatusMock('denied');
      render(<ProfileScreen />);
      expect(screen.getByTestId('push-status-blocked')).toBeTruthy();
      expect(screen.getByText('Notifications are blocked. Enable them in your device settings.')).toBeTruthy();
    });

    it('shows enable button when permission is undetermined', () => {
      setPushStatusMock('undetermined');
      render(<ProfileScreen />);
      expect(screen.getByTestId('push-status-prompt')).toBeTruthy();
      expect(screen.getByText('ENABLE NOTIFICATIONS')).toBeTruthy();
    });
  });

  it('pressing Save Settings calls both mutations with correct args', () => {
    setQueryMock({ data: { ...mockPrefs, enableDailyReminder: false, enableStreak: true, enableLessonAvailable: true } });
    render(<ProfileScreen />);
    fireEvent.press(screen.getByText('SAVE SETTINGS'));
    expect(mockMutate).toHaveBeenCalledWith({
      enableDailyReminder: false,
      enableStreak: true,
      enableLessonAvailable: true,
    });
    expect(mockProfileMutate).toHaveBeenCalledWith({
      preferredTime: '08:00',
      timezone: 'UTC',
    });
  });

  it('Save Settings sends updated time when picker is changed', () => {
    setQueryMock({ data: { ...mockPrefs, enableDailyReminder: true } });
    render(<ProfileScreen />);
    const picker = screen.getByTestId('reminder-time-picker');
    const newTime = new Date();
    newTime.setHours(20, 15, 0, 0);
    fireEvent(picker, 'change', { nativeEvent: { timestamp: newTime.getTime() } });
    fireEvent.press(screen.getByText('SAVE SETTINGS'));
    expect(mockProfileMutate).toHaveBeenCalledWith({
      preferredTime: '20:15',
      timezone: 'UTC',
    });
  });

  it('shows success message when both saves succeed', () => {
    setMutationMock({ isSuccess: true });
    setProfileMutationMock({ isSuccess: true });
    render(<ProfileScreen />);
    expect(screen.getByText('Settings saved')).toBeTruthy();
  });

  it('shows fallback error message when save fails with no API message', () => {
    setMutationMock({ isError: true, error: null });
    render(<ProfileScreen />);
    expect(screen.getByTestId('settings-error')).toBeTruthy();
    expect(screen.getByText('Something went wrong. Please try again.')).toBeTruthy();
  });

  it('shows API error message when notification prefs save fails', () => {
    setMutationMock({
      isError: true,
      error: { response: { data: { message: 'Notification service unavailable' } } },
    });
    render(<ProfileScreen />);
    expect(screen.getByText('Notification service unavailable')).toBeTruthy();
  });

  it('shows error when profile update fails', () => {
    setProfileMutationMock({
      isError: true,
      error: { response: { data: { message: 'Profile update failed' } } },
    });
    render(<ProfileScreen />);
    expect(screen.getByTestId('settings-error')).toBeTruthy();
    expect(screen.getByText('Profile update failed')).toBeTruthy();
  });

  it('places the settings block above the Log Out button', () => {
    const { toJSON } = render(<ProfileScreen />);
    const json = JSON.stringify(toJSON());
    expect(json.indexOf('SAVE SETTINGS')).toBeGreaterThan(-1);
    expect(json.indexOf('SAVE SETTINGS')).toBeLessThan(json.indexOf('LOG OUT'));
  });

  describe('Manage Subscription — 073b-8', () => {
    let openURLSpy: jest.SpyInstance;

    beforeEach(() => {
      openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    });

    afterEach(() => {
      openURLSpy.mockRestore();
    });

    it('renders the Manage Subscription button', () => {
      render(<ProfileScreen />);
      expect(screen.getByTestId('manage-subscription-btn')).toBeTruthy();
    });

    it('pressing Manage Subscription opens the iOS manage-subscriptions URL', () => {
      render(<ProfileScreen />);
      fireEvent.press(screen.getByTestId('manage-subscription-btn'));
      expect(openURLSpy).toHaveBeenCalledWith('itms-apps://apps.apple.com/account/subscriptions');
    });
  });

  describe('Ticket 072j — safe-area edges', () => {
    it('uses edges=[left,right,bottom] so the tab layout owns the top inset', () => {
      render(<ProfileScreen />);
      expect(capturedEdges).toEqual(['left', 'right', 'bottom']);
    });
  });
});
