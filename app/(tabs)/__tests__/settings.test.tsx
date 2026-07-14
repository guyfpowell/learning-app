import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import SettingsScreen from '../settings';
import { useAuthStore } from '@/store/auth.store';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/hooks/useNotificationPrefs';
import { useProfile, useUpdateProfile } from '@/hooks/useOnboarding';
import { usePushStatus } from '@/hooks/usePushStatus';
import type { NotificationPreference } from '@learning/shared';

jest.mock('@/store/auth.store', () => ({ useAuthStore: jest.fn() }));
jest.mock('@/hooks/useNotificationPrefs', () => ({
  useNotificationPreferences: jest.fn(),
  useUpdateNotificationPreferences: jest.fn(),
}));
jest.mock('@/hooks/useOnboarding', () => ({
  useProfile: jest.fn(),
  useUpdateProfile: jest.fn(),
}));
jest.mock('@/hooks/usePushStatus', () => ({ usePushStatus: jest.fn() }));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as unknown as jest.Mock).mockReturnValue(mockUser);
    setQueryMock();
    setMutationMock();
    setProfileQueryMock();
    setProfileMutationMock();
    setPushStatusMock();
  });

  it('renders without errors', () => {
    expect(() => render(<SettingsScreen />)).not.toThrow();
  });

  it('shows Settings heading', () => {
    render(<SettingsScreen />);
    expect(screen.getByText('Settings')).toBeTruthy();
  });

  it('shows spinner while loading preferences', () => {
    setQueryMock({ data: undefined, isLoading: true });
    render(<SettingsScreen />);
    expect(screen.getByTestId('prefs-loading')).toBeTruthy();
  });

  it('shows user name in profile section', () => {
    render(<SettingsScreen />);
    expect(screen.getByText('Test User')).toBeTruthy();
  });

  it('shows user email in profile section', () => {
    render(<SettingsScreen />);
    expect(screen.getByText('user@example.com')).toBeTruthy();
  });

  it('shows daily reminder label', () => {
    render(<SettingsScreen />);
    expect(screen.getByText('Daily reminder')).toBeTruthy();
  });

  it('shows streak milestone label', () => {
    render(<SettingsScreen />);
    expect(screen.getByText('Streak milestones')).toBeTruthy();
  });

  it('shows new lesson available label', () => {
    render(<SettingsScreen />);
    expect(screen.getByText('New lesson available')).toBeTruthy();
  });

  it('hides the time picker when daily reminder is off', () => {
    setQueryMock({ data: { ...mockPrefs, enableDailyReminder: false } });
    render(<SettingsScreen />);
    expect(screen.queryByTestId('reminder-time-picker')).toBeNull();
  });

  it('shows the time picker when daily reminder is on', () => {
    setQueryMock({ data: { ...mockPrefs, enableDailyReminder: true } });
    render(<SettingsScreen />);
    expect(screen.getByTestId('reminder-time-picker')).toBeTruthy();
  });

  it('toggling daily reminder on reveals the time picker', () => {
    setQueryMock({ data: { ...mockPrefs, enableDailyReminder: false } });
    render(<SettingsScreen />);
    expect(screen.queryByTestId('reminder-time-picker')).toBeNull();
    fireEvent(screen.getByTestId('toggle-daily-reminder'), 'valueChange', true);
    expect(screen.getByTestId('reminder-time-picker')).toBeTruthy();
  });

  it('initialises the time picker from profile preferredTime', () => {
    setProfileQueryMock({ data: { preferredTime: '14:30' } });
    setQueryMock({ data: { ...mockPrefs, enableDailyReminder: true } });
    render(<SettingsScreen />);
    const picker = screen.getByTestId('reminder-time-picker');
    const value = new Date(picker.props.date);
    expect(value.getHours()).toBe(14);
    expect(value.getMinutes()).toBe(30);
  });

  describe('push notification status', () => {
    it('shows enabled state when permission is granted', () => {
      setPushStatusMock('granted');
      render(<SettingsScreen />);
      expect(screen.getByTestId('push-status-enabled')).toBeTruthy();
      expect(screen.getByText('Push notifications are enabled')).toBeTruthy();
    });

    it('shows blocked message when permission is denied', () => {
      setPushStatusMock('denied');
      render(<SettingsScreen />);
      expect(screen.getByTestId('push-status-blocked')).toBeTruthy();
      expect(screen.getByText('Notifications are blocked. Enable them in your device settings.')).toBeTruthy();
    });

    it('shows enable button when permission is undetermined', () => {
      setPushStatusMock('undetermined');
      render(<SettingsScreen />);
      expect(screen.getByTestId('push-status-prompt')).toBeTruthy();
      expect(screen.getByText('ENABLE NOTIFICATIONS')).toBeTruthy();
    });
  });

  it('pressing Save Settings calls both mutations with correct args', () => {
    setQueryMock({ data: { ...mockPrefs, enableDailyReminder: false, enableStreak: true, enableLessonAvailable: true } });
    render(<SettingsScreen />);
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
    render(<SettingsScreen />);
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
    render(<SettingsScreen />);
    expect(screen.getByText('Settings saved')).toBeTruthy();
  });

  it('shows fallback error message when save fails with no API message', () => {
    setMutationMock({ isError: true, error: null });
    render(<SettingsScreen />);
    expect(screen.getByTestId('settings-error')).toBeTruthy();
    expect(screen.getByText('Something went wrong. Please try again.')).toBeTruthy();
  });

  it('shows API error message when notification prefs save fails', () => {
    setMutationMock({
      isError: true,
      error: { response: { data: { message: 'Notification service unavailable' } } },
    });
    render(<SettingsScreen />);
    expect(screen.getByText('Notification service unavailable')).toBeTruthy();
  });

  it('shows error when profile update fails', () => {
    setProfileMutationMock({
      isError: true,
      error: { response: { data: { message: 'Profile update failed' } } },
    });
    render(<SettingsScreen />);
    expect(screen.getByTestId('settings-error')).toBeTruthy();
    expect(screen.getByText('Profile update failed')).toBeTruthy();
  });
});
