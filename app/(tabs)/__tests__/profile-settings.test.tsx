import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Linking, StyleSheet } from 'react-native';
import { must } from '@/test-utils/must';
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
    resolvedOptions: () => ({ locale: 'en-GB', calendar: 'gregory', numberingSystem: 'latn', timeZone: 'UTC' }),
    format: jest.fn(),
    formatToParts: jest.fn(),
    formatRange: jest.fn(),
    formatRangeToParts: jest.fn(),
  }));
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
  enableStreak: true,
  enableLessonAvailable: true,
  enableTopicFeedback: true,
  enableSuggestions: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockMutate = jest.fn();
const mockProfileMutate = jest.fn();
const mockRegister = jest.fn();

function setPushStatusMock(
  permissionStatus: 'granted' | 'denied' | 'undetermined' = 'granted',
  error: string | null = null,
) {
  (usePushStatus as jest.Mock).mockReturnValue({ permissionStatus, register: mockRegister, error });
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
    jest.mocked(useAuthStore).mockReturnValue(mockUser);
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

  it('096: one grey-caps heading style: Saved, Reminders, Account (no cards, no "Settings" block)', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('Saved')).toBeTruthy();
    expect(screen.getByText('Reminders')).toBeTruthy();
    expect(screen.getByText('Account')).toBeTruthy();
    expect(screen.queryByText('Settings')).toBeNull();
    expect(screen.queryByText('Push Notifications')).toBeNull();
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
    expect(screen.getByText('Daily lesson reminder')).toBeTruthy();
  });

  it('shows streak milestone label', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('Streak milestone notifications')).toBeTruthy();
  });

  it('shows new lesson available label', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('New lesson available alerts')).toBeTruthy();
  });

  it('hides the time picker when daily reminder is off', () => {
    setQueryMock({ data: { ...mockPrefs, enableDailyReminder: false } });
    render(<ProfileScreen />);
    expect(screen.queryByTestId('reminder-time-picker')).toBeNull();
  });

  it('096: with the daily reminder on, a time row shows the time and the wheel stays closed', () => {
    setQueryMock({ data: { ...mockPrefs, enableDailyReminder: true } });
    render(<ProfileScreen />);
    expect(screen.getByTestId('reminder-time-value')).toHaveTextContent('08:00');
    expect(screen.queryByTestId('reminder-time-picker')).toBeNull();
  });

  it('096: tapping the time row opens the wheel, and again closes it', () => {
    setQueryMock({ data: { ...mockPrefs, enableDailyReminder: true } });
    render(<ProfileScreen />);
    fireEvent.press(screen.getByTestId('reminder-time-row'));
    expect(screen.getByTestId('reminder-time-picker')).toBeTruthy();
    fireEvent.press(screen.getByTestId('reminder-time-row'));
    expect(screen.queryByTestId('reminder-time-picker')).toBeNull();
  });

  it('toggling daily reminder on reveals the time row', () => {
    setQueryMock({ data: { ...mockPrefs, enableDailyReminder: false } });
    render(<ProfileScreen />);
    expect(screen.queryByTestId('reminder-time-row')).toBeNull();
    fireEvent(screen.getByTestId('toggle-enableDailyReminder'), 'valueChange', true);
    expect(screen.getByTestId('reminder-time-row')).toBeTruthy();
  });

  it('initialises the time picker from profile preferredTime', () => {
    setProfileQueryMock({ data: { preferredTime: '14:30' } });
    setQueryMock({ data: { ...mockPrefs, enableDailyReminder: true } });
    render(<ProfileScreen />);
    expect(screen.getByTestId('reminder-time-value')).toHaveTextContent('14:30');
    fireEvent.press(screen.getByTestId('reminder-time-row'));
    const picker = screen.getByTestId('reminder-time-picker');
    const value = new Date(picker.props.date);
    expect(value.getHours()).toBe(14);
    expect(value.getMinutes()).toBe(30);
  });

  describe('push notification status', () => {
    it('096: says nothing when permission is granted', () => {
      setPushStatusMock('granted');
      render(<ProfileScreen />);
      expect(screen.queryByTestId('push-status-enabled')).toBeNull();
      expect(screen.queryByTestId('push-status-prompt')).toBeNull();
      expect(screen.queryByTestId('push-status-blocked')).toBeNull();
    });

    it('shows blocked message when permission is denied', () => {
      setPushStatusMock('denied');
      render(<ProfileScreen />);
      expect(screen.getByTestId('push-status-blocked')).toBeTruthy();
      expect(screen.getByText('Notifications are blocked. Enable them in your device settings.')).toBeTruthy();
    });

    it('096: shows a "turn on" row when permission is undetermined, and pressing it registers', () => {
      setPushStatusMock('undetermined');
      render(<ProfileScreen />);
      expect(screen.getByText('Notifications are off on this phone')).toBeTruthy();
      fireEvent.press(screen.getByTestId('push-status-prompt'));
      expect(mockRegister).toHaveBeenCalled();
    });

    it('shows the push error on screen', () => {
      setPushStatusMock('undetermined', 'Could not enable notifications. Please try again.');
      render(<ProfileScreen />);
      expect(screen.getByText('Could not enable notifications. Please try again.')).toBeTruthy();
      expect(screen.getByTestId('push-status-error')).toBeTruthy();
    });
  });

  it('096: Save changes is disabled until something changes, and it is the only blue button', () => {
    render(<ProfileScreen />);
    const save = () => StyleSheet.flatten(must(screen.getByText('Save changes').parent?.parent, 'button').props.style);
    expect(save().opacity).toBeLessThan(1);
    fireEvent.press(screen.getByText('Save changes'));
    expect(mockMutate).not.toHaveBeenCalled();
    fireEvent(screen.getByTestId('toggle-enableStreak'), 'valueChange', false);
    expect(save().opacity).toBeUndefined();
    fireEvent(screen.getByTestId('toggle-enableStreak'), 'valueChange', true);
    expect(save().opacity).toBeLessThan(1);
  });

  it('096: a person who has never saved a reminder time can save the one shown', () => {
    setProfileQueryMock({ data: { preferredTime: undefined } });
    render(<ProfileScreen />);
    fireEvent.press(screen.getByText('Save changes'));
    expect(mockProfileMutate).toHaveBeenCalledWith({ preferredTime: '08:00', timezone: 'UTC' });
  });

  it('pressing Save changes calls both mutations with correct args', () => {
    setQueryMock({ data: { ...mockPrefs, enableDailyReminder: false, enableStreak: true, enableLessonAvailable: true } });
    render(<ProfileScreen />);
    fireEvent(screen.getByTestId('toggle-enableLessonAvailable'), 'valueChange', false);
    fireEvent.press(screen.getByText('Save changes'));
    expect(mockMutate).toHaveBeenCalledWith({
      enableDailyReminder: false,
      enableStreak: true,
      enableLessonAvailable: false,
      enableTopicFeedback: true,
      enableSuggestions: true,
    });
    expect(mockProfileMutate).toHaveBeenCalledWith({
      preferredTime: '08:00',
      timezone: 'UTC',
    });
  });

  it('the topic feedback toggle (079d) is saved with the other preferences', () => {
    setQueryMock({ data: mockPrefs });
    render(<ProfileScreen />);
    expect(screen.getByText('Ask me how each topic went')).toBeTruthy();
    expect(screen.getByTestId('toggle-enableTopicFeedback').props.value).toBe(true);
    fireEvent(screen.getByTestId('toggle-enableTopicFeedback'), 'valueChange', false);
    fireEvent.press(screen.getByText('Save changes'));
    expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({ enableTopicFeedback: false }));
  });

  // VoiceOver read "switch, on" with no name: a native Switch is not named by the Text beside it.
  it.each([
    ['enableDailyReminder', 'Daily lesson reminder'],
    ['enableStreak', 'Streak milestone notifications'],
    ['enableLessonAvailable', 'New lesson available alerts'],
    ['enableTopicFeedback', 'Ask me how each topic went'],
    ['enableSuggestions', "Albert's suggestions"],
  ])('the %s switch is named by its label', (field, label) => {
    render(<ProfileScreen />);
    expect(screen.getByTestId(`toggle-${field}`).props.accessibilityLabel).toBe(label);
  });

  it('says the toggles did not load, and a save does not write defaults over them', () => {
    setQueryMock({ data: undefined, isError: true });
    render(<ProfileScreen />);
    expect(screen.getByTestId('prefs-error')).toBeTruthy();
    expect(screen.queryByTestId('toggle-enableSuggestions')).toBeNull();
    fireEvent.press(screen.getByText('Save changes'));
    expect(mockMutate).not.toHaveBeenCalled();
    expect(mockProfileMutate).not.toHaveBeenCalled();
  });

  it("the Albert's suggestions toggle (079g8) is saved with the other preferences", () => {
    setQueryMock({ data: mockPrefs });
    render(<ProfileScreen />);
    expect(screen.getByTestId('toggle-enableSuggestions').props.value).toBe(true);
    fireEvent(screen.getByTestId('toggle-enableSuggestions'), 'valueChange', false);
    fireEvent.press(screen.getByText('Save changes'));
    expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({ enableSuggestions: false }));
  });

  it('Save changes sends updated time when picker is changed', () => {
    setQueryMock({ data: { ...mockPrefs, enableDailyReminder: true } });
    render(<ProfileScreen />);
    fireEvent.press(screen.getByTestId('reminder-time-row'));
    const picker = screen.getByTestId('reminder-time-picker');
    const newTime = new Date();
    newTime.setHours(20, 15, 0, 0);
    fireEvent(picker, 'change', { nativeEvent: { timestamp: newTime.getTime() } });
    fireEvent.press(screen.getByText('Save changes'));
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

  it('places the reminders block above the Account rows, and log out is a plain row (096)', () => {
    const { toJSON } = render(<ProfileScreen />);
    const json = JSON.stringify(toJSON());
    expect(json.indexOf('Save changes')).toBeGreaterThan(-1);
    expect(json.indexOf('Save changes')).toBeLessThan(json.indexOf('Log out'));
    expect(screen.getByTestId('logout-btn')).toBeTruthy();
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
    it('uses edges=[left,right] so the tab layout owns the top inset and the tab bar the bottom one (090)', () => {
      render(<ProfileScreen />);
      expect(capturedEdges).toEqual(['left', 'right']);
    });
  });
});
