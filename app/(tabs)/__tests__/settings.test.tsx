import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import SettingsScreen from '../settings';
import { useAuthStore } from '@/store/auth.store';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/hooks/useNotificationPrefs';
import type { NotificationPreference } from '@learning/shared';

jest.mock('@/store/auth.store', () => ({ useAuthStore: jest.fn() }));
jest.mock('@/hooks/useNotificationPrefs', () => ({
  useNotificationPreferences: jest.fn(),
  useUpdateNotificationPreferences: jest.fn(),
}));

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
    expect(screen.queryByText('Morning')).toBeNull();
    expect(screen.queryByText('Afternoon')).toBeNull();
    expect(screen.queryByText('Evening')).toBeNull();
  });

  it('shows reminder time picker when daily reminder is on', () => {
    setQueryMock({ data: { ...mockPrefs, enableDailyReminder: true } });
    render(<SettingsScreen />);
    expect(screen.getByText('Morning')).toBeTruthy();
    expect(screen.getByText('Afternoon')).toBeTruthy();
    expect(screen.getByText('Evening')).toBeTruthy();
  });

  it('toggling daily reminder on reveals time picker', () => {
    setQueryMock({ data: { ...mockPrefs, enableDailyReminder: false } });
    render(<SettingsScreen />);
    expect(screen.queryByText('Morning')).toBeNull();
    fireEvent(screen.getByTestId('toggle-daily-reminder'), 'valueChange', true);
    expect(screen.getByText('Morning')).toBeTruthy();
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

  it('shows error message when save fails', () => {
    setMutationMock({ isError: true });
    render(<SettingsScreen />);
    expect(screen.getByText('Failed to save settings. Please try again.')).toBeTruthy();
  });
});
