import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import SettingsScreen from '../settings';
import { useAuthStore } from '@/store/auth.store';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/hooks/useNotificationPrefs';
import { usePushStatus } from '@/hooks/usePushStatus';
import type { NotificationPreference } from '@learning/shared';

jest.mock('@/store/auth.store', () => ({ useAuthStore: jest.fn() }));
jest.mock('@/hooks/useNotificationPrefs', () => ({
  useNotificationPreferences: jest.fn(),
  useUpdateNotificationPreferences: jest.fn(),
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
    ...overrides,
  });
}

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as unknown as jest.Mock).mockReturnValue(mockUser);
    setQueryMock();
    setMutationMock();
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

  it('hides reminder time picker when daily reminder is off', () => {
    setQueryMock({ data: { ...mockPrefs, enableDailyReminder: false } });
    render(<SettingsScreen />);
    expect(screen.queryByText('Morning (8 AM)')).toBeNull();
    expect(screen.queryByText('Afternoon (1 PM)')).toBeNull();
    expect(screen.queryByText('Evening (7 PM)')).toBeNull();
  });

  it('shows reminder time picker when daily reminder is on', () => {
    setQueryMock({ data: { ...mockPrefs, enableDailyReminder: true } });
    render(<SettingsScreen />);
    expect(screen.getByText('Morning (8 AM)')).toBeTruthy();
    expect(screen.getByText('Afternoon (1 PM)')).toBeTruthy();
    expect(screen.getByText('Evening (7 PM)')).toBeTruthy();
  });

  it('toggling daily reminder on reveals time picker', () => {
    setQueryMock({ data: { ...mockPrefs, enableDailyReminder: false } });
    render(<SettingsScreen />);
    expect(screen.queryByText('Morning (8 AM)')).toBeNull();
    fireEvent(screen.getByTestId('toggle-daily-reminder'), 'valueChange', true);
    expect(screen.getByText('Morning (8 AM)')).toBeTruthy();
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

  it('pressing Save Settings calls mutate with current prefs', () => {
    setQueryMock({ data: { ...mockPrefs, enableDailyReminder: false, enableStreak: true, enableLessonAvailable: true } });
    render(<SettingsScreen />);
    fireEvent.press(screen.getByText('SAVE SETTINGS'));
    expect(mockMutate).toHaveBeenCalledWith({
      enableDailyReminder: false,
      reminderTime: undefined,
      enableStreak: true,
      enableLessonAvailable: true,
    });
  });

  it('includes reminder time in mutate call when daily reminder is on', () => {
    setQueryMock({ data: { ...mockPrefs, enableDailyReminder: true, reminderTime: 'afternoon' } });
    render(<SettingsScreen />);
    fireEvent.press(screen.getByText('SAVE SETTINGS'));
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ enableDailyReminder: true, reminderTime: 'afternoon' })
    );
  });

  it('shows success message after save', () => {
    setMutationMock({ isSuccess: true });
    render(<SettingsScreen />);
    expect(screen.getByText('Settings saved')).toBeTruthy();
  });

  it('shows fallback error message when save fails with no API message', () => {
    setMutationMock({ isError: true, error: null });
    render(<SettingsScreen />);
    expect(screen.getByTestId('settings-error')).toBeTruthy();
    expect(screen.getByText('Something went wrong. Please try again.')).toBeTruthy();
  });

  it('shows API error message when save fails with API-provided message', () => {
    setMutationMock({
      isError: true,
      error: { response: { data: { message: 'Notification service unavailable' } } },
    });
    render(<SettingsScreen />);
    expect(screen.getByText('Notification service unavailable')).toBeTruthy();
  });
});
