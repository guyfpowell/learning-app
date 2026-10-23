import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import * as Sentry from '@sentry/react-native';
import { usePushStatus } from '../usePushStatus';
import { registerForPushNotifications } from '../useNotifications';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
}));
jest.mock('../useNotifications', () => ({ registerForPushNotifications: jest.fn() }));

const mockGetPermissions = Notifications.getPermissionsAsync as jest.Mock;
const mockRegister = registerForPushNotifications as jest.Mock;

describe('usePushStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPermissions.mockResolvedValue({ status: 'granted' });
    mockRegister.mockResolvedValue(undefined);
  });

  it('reads the permission status on mount', async () => {
    const { result } = renderHook(() => usePushStatus());
    await waitFor(() => expect(result.current.permissionStatus).toBe('granted'));
    expect(result.current.error).toBeNull();
  });

  it('logs and surfaces an error when the status check rejects', async () => {
    mockGetPermissions.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => usePushStatus());

    await waitFor(() => expect(result.current.error).toBe('Could not check notification settings.'));
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'push', message: 'Push status check failed' }),
    );
  });

  it('logs and surfaces an error when register rejects', async () => {
    mockRegister.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => usePushStatus());
    await waitFor(() => expect(result.current.permissionStatus).toBe('granted'));

    await act(async () => {
      await result.current.register();
    });

    expect(result.current.error).toBe('Could not enable notifications. Please try again.');
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'push', message: 'Push registration failed' }),
    );
  });

  it('clears the error when a later check succeeds', async () => {
    mockGetPermissions.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => usePushStatus());
    await waitFor(() => expect(result.current.error).not.toBeNull());

    await act(async () => {
      await result.current.register();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.permissionStatus).toBe('granted');
  });
});
