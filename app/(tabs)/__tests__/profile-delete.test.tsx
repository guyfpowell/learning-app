import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import ProfileScreen from '../profile';
import { useAuthStore } from '@/store/auth.store';
import { useLogout, useDeleteAccount, useDeleteAccountPreflight } from '@/hooks/useAuth';
import { useProgress } from '@/hooks/useProgress';
import { usePaths } from '@/hooks/useTrack';
import { useSavedLessons } from '@/hooks/useLesson';
import { useAchievements } from '@/hooks/useAchievements';

jest.mock('@/store/auth.store', () => ({ useAuthStore: jest.fn() }));
jest.mock('@/hooks/useAuth', () => ({
  useLogout: jest.fn(),
  useDeleteAccount: jest.fn(),
  useDeleteAccountPreflight: jest.fn(),
}));
jest.mock('@/hooks/useProgress', () => ({ useProgress: jest.fn() }));
jest.mock('@/hooks/useTrack', () => ({ usePaths: jest.fn() }));
jest.mock('@/hooks/useLesson', () => ({ useSavedLessons: jest.fn() }));
jest.mock('@/hooks/useAchievements', () => ({ useAchievements: jest.fn() }));
jest.mock('@/hooks/useNotificationPrefs', () => ({
  useNotificationPreferences: jest.fn(() => ({ data: undefined, isLoading: false })),
  useUpdateNotificationPreferences: jest.fn(() => ({ mutate: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
}));
jest.mock('@/hooks/useProfile', () => ({
  useProfile: jest.fn(() => ({ data: undefined })),
  useUpdateProfile: jest.fn(() => ({ mutate: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
}));
jest.mock('@/hooks/usePushStatus', () => ({ usePushStatus: jest.fn(() => ({ permissionStatus: 'granted', register: jest.fn() })) }));

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

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockUser = { id: 'u1', email: 'user@example.com', name: 'Test User' };
const mockMutate = jest.fn();

function setDefaults({
  deleteAccountMutate = mockMutate,
  deleteAccountIsPending = false,
  deleteAccountIsError = false,
  deleteAccountError = null as unknown,
  preflightData = { teamOwnerships: [] },
  preflightIsLoading = false,
}: {
  deleteAccountMutate?: jest.Mock;
  deleteAccountIsPending?: boolean;
  deleteAccountIsError?: boolean;
  deleteAccountError?: unknown;
  preflightData?: { teamOwnerships: { teamId: string; teamName: string; newOwnerName: string | null }[] };
  preflightIsLoading?: boolean;
} = {}) {
  (useAuthStore as unknown as jest.Mock).mockReturnValue(mockUser);
  (useLogout as jest.Mock).mockReturnValue({ mutate: jest.fn(), isPending: false });
  (useDeleteAccount as jest.Mock).mockReturnValue({
    mutate: deleteAccountMutate,
    isPending: deleteAccountIsPending,
    isError: deleteAccountIsError,
    error: deleteAccountError,
    reset: jest.fn(),
  });
  (useDeleteAccountPreflight as jest.Mock).mockReturnValue({
    data: preflightIsLoading ? undefined : preflightData,
    isLoading: preflightIsLoading,
  });
  (useProgress as jest.Mock).mockReturnValue({ data: undefined });
  (usePaths as jest.Mock).mockReturnValue({ data: [] });
  (useSavedLessons as jest.Mock).mockReturnValue({ data: [] });
  (useAchievements as jest.Mock).mockReturnValue({ data: undefined, isLoading: false });
}

// ─────────────────────────────────────────────────────────────────────────────

describe('ProfileScreen — Delete Account flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setDefaults();
  });

  it('shows a Delete Account button on the profile screen', () => {
    render(<ProfileScreen />);
    expect(screen.getByTestId('delete-account-btn')).toBeTruthy();
  });

  it('opens the delete modal when Delete Account is pressed', () => {
    render(<ProfileScreen />);
    fireEvent.press(screen.getByTestId('delete-account-btn'));
    expect(screen.getByTestId('delete-step-overview')).toBeTruthy();
  });

  // ── Step 1 (overview) ──────────────────────────────────────────────────────

  it('shows what will be deleted on step 1', () => {
    render(<ProfileScreen />);
    fireEvent.press(screen.getByTestId('delete-account-btn'));
    expect(screen.getByText(/learning progress/i)).toBeTruthy();
    expect(screen.getByText(/your achievements/i)).toBeTruthy();
  });

  it('shows a subscription warning on step 1', () => {
    render(<ProfileScreen />);
    fireEvent.press(screen.getByTestId('delete-account-btn'));
    expect(screen.getByTestId('subscription-warning-text')).toBeTruthy();
  });

  it('Continue is disabled until the subscription warning is acknowledged', () => {
    render(<ProfileScreen />);
    fireEvent.press(screen.getByTestId('delete-account-btn'));
    const continueBtn = screen.getByTestId('delete-step1-continue-btn');
    expect(continueBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it('Continue is enabled once the subscription warning is acknowledged', () => {
    render(<ProfileScreen />);
    fireEvent.press(screen.getByTestId('delete-account-btn'));
    fireEvent(screen.getByTestId('subscription-acknowledged-checkbox'), 'valueChange', true);
    const continueBtn = screen.getByTestId('delete-step1-continue-btn');
    expect(continueBtn.props.accessibilityState?.disabled).toBeFalsy();
  });

  it('shows team ownership info when the user owns a team', () => {
    setDefaults({
      preflightData: {
        teamOwnerships: [{ teamId: 't1', teamName: 'Acme', newOwnerName: 'Jane Smith' }],
      },
    });
    render(<ProfileScreen />);
    fireEvent.press(screen.getByTestId('delete-account-btn'));
    expect(screen.getByText(/Ownership of Acme will pass to Jane Smith/i)).toBeTruthy();
  });

  it('shows team deletion notice when there are no remaining members', () => {
    setDefaults({
      preflightData: {
        teamOwnerships: [{ teamId: 't2', teamName: 'Solo Team', newOwnerName: null }],
      },
    });
    render(<ProfileScreen />);
    fireEvent.press(screen.getByTestId('delete-account-btn'));
    expect(screen.getByText(/Solo Team will be deleted/i)).toBeTruthy();
  });

  // ── Step 2 (password) ─────────────────────────────────────────────────────

  it('advances to step 2 (password) after acknowledging subscription and pressing Continue', () => {
    render(<ProfileScreen />);
    fireEvent.press(screen.getByTestId('delete-account-btn'));
    fireEvent(screen.getByTestId('subscription-acknowledged-checkbox'), 'valueChange', true);
    fireEvent.press(screen.getByTestId('delete-step1-continue-btn'));
    expect(screen.getByTestId('delete-step-password')).toBeTruthy();
  });

  it('shows a password input on step 2', () => {
    render(<ProfileScreen />);
    fireEvent.press(screen.getByTestId('delete-account-btn'));
    fireEvent(screen.getByTestId('subscription-acknowledged-checkbox'), 'valueChange', true);
    fireEvent.press(screen.getByTestId('delete-step1-continue-btn'));
    expect(screen.getByTestId('delete-password-input')).toBeTruthy();
  });

  it('Continue on step 2 is disabled when password is empty', () => {
    render(<ProfileScreen />);
    fireEvent.press(screen.getByTestId('delete-account-btn'));
    fireEvent(screen.getByTestId('subscription-acknowledged-checkbox'), 'valueChange', true);
    fireEvent.press(screen.getByTestId('delete-step1-continue-btn'));
    expect(screen.getByTestId('delete-step2-continue-btn').props.accessibilityState?.disabled).toBe(true);
  });

  it('Continue on step 2 is enabled when password is entered', () => {
    render(<ProfileScreen />);
    fireEvent.press(screen.getByTestId('delete-account-btn'));
    fireEvent(screen.getByTestId('subscription-acknowledged-checkbox'), 'valueChange', true);
    fireEvent.press(screen.getByTestId('delete-step1-continue-btn'));
    fireEvent.changeText(screen.getByTestId('delete-password-input'), 'secret123');
    expect(screen.getByTestId('delete-step2-continue-btn').props.accessibilityState?.disabled).toBeFalsy();
  });

  // ── Step 3 (confirm) ──────────────────────────────────────────────────────

  function goToStep3() {
    fireEvent.press(screen.getByTestId('delete-account-btn'));
    fireEvent(screen.getByTestId('subscription-acknowledged-checkbox'), 'valueChange', true);
    fireEvent.press(screen.getByTestId('delete-step1-continue-btn'));
    fireEvent.changeText(screen.getByTestId('delete-password-input'), 'secret123');
    fireEvent.press(screen.getByTestId('delete-step2-continue-btn'));
  }

  it('advances to step 3 (confirm) after entering password and pressing Continue', () => {
    render(<ProfileScreen />);
    goToStep3();
    expect(screen.getByTestId('delete-step-confirm')).toBeTruthy();
  });

  it('shows a type-to-confirm input on step 3', () => {
    render(<ProfileScreen />);
    goToStep3();
    expect(screen.getByTestId('delete-confirm-input')).toBeTruthy();
  });

  it('Delete button on step 3 is disabled until DELETE is typed', () => {
    render(<ProfileScreen />);
    goToStep3();
    expect(screen.getByTestId('delete-confirm-btn').props.accessibilityState?.disabled).toBe(true);
  });

  it('Delete button is disabled when partial text is typed', () => {
    render(<ProfileScreen />);
    goToStep3();
    fireEvent.changeText(screen.getByTestId('delete-confirm-input'), 'DELET');
    expect(screen.getByTestId('delete-confirm-btn').props.accessibilityState?.disabled).toBe(true);
  });

  it('Delete button is enabled only when exactly DELETE is typed', () => {
    render(<ProfileScreen />);
    goToStep3();
    fireEvent.changeText(screen.getByTestId('delete-confirm-input'), 'DELETE');
    expect(screen.getByTestId('delete-confirm-btn').props.accessibilityState?.disabled).toBeFalsy();
  });

  it('calls deleteAccount.mutate with the password when Delete is pressed', () => {
    const mutate = jest.fn();
    setDefaults({ deleteAccountMutate: mutate });
    render(<ProfileScreen />);
    goToStep3();
    fireEvent.changeText(screen.getByTestId('delete-confirm-input'), 'DELETE');
    fireEvent.press(screen.getByTestId('delete-confirm-btn'));
    expect(mutate).toHaveBeenCalledWith('secret123', expect.any(Object));
  });

  it('shows an error message on step 3 when deletion fails', () => {
    setDefaults({
      deleteAccountIsError: true,
      deleteAccountError: { response: { data: { message: 'Invalid password.' } } },
    });
    render(<ProfileScreen />);
    goToStep3();
    fireEvent.changeText(screen.getByTestId('delete-confirm-input'), 'DELETE');
    expect(screen.getByTestId('delete-error-msg')).toBeTruthy();
    expect(screen.getByText(/Invalid password/i)).toBeTruthy();
  });

  it('shows the last-admin error message clearly', () => {
    setDefaults({
      deleteAccountIsError: true,
      deleteAccountError: {
        response: { data: { message: 'You are the only admin. Assign another admin before deleting your account.' } },
      },
    });
    render(<ProfileScreen />);
    goToStep3();
    expect(screen.getByText(/only admin/i)).toBeTruthy();
  });

  // ── Cancel / close ────────────────────────────────────────────────────────

  it('closes the modal when Cancel is pressed on step 1', () => {
    render(<ProfileScreen />);
    fireEvent.press(screen.getByTestId('delete-account-btn'));
    expect(screen.getByTestId('delete-step-overview')).toBeTruthy();
    fireEvent.press(screen.getByTestId('delete-modal-cancel-btn'));
    expect(screen.queryByTestId('delete-step-overview')).toBeNull();
  });
});
