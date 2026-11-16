import { renderHook } from '@testing-library/react-native';
import { useNotifications } from '../useNotifications';
import * as Notifications from 'expo-notifications';
import * as Sentry from '@sentry/react-native';
import { PUSH_TOKEN_WRITE, runSafeWrite } from '@/lib/safeWrites';
import { queryWrapper } from '@/test-utils/queryClient';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'ExponentPushToken[test-token]' })),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  AndroidImportance: { MAX: 5 },
}));

jest.mock('expo-device', () => ({
  isDevice: true,
}));

jest.mock('@/lib/safeWrites', () => ({
  PUSH_TOKEN_WRITE: { mutationKey: ['push-token'] },
  runSafeWrite: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

const mockRunSafeWrite = runSafeWrite as jest.Mock;
const mockGetPermissions = Notifications.getPermissionsAsync as jest.Mock;
const mockRequestPermissions = Notifications.requestPermissionsAsync as jest.Mock;
const mockGetToken = Notifications.getExpoPushTokenAsync as jest.Mock;

describe('useNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    mockGetPermissions.mockResolvedValue({ status: 'granted' });
    mockRequestPermissions.mockResolvedValue({ status: 'granted' });
    mockGetToken.mockResolvedValue({ data: 'ExponentPushToken[test-token]' });
  });

  it('sets every foreground handler field explicitly', async () => {
    jest.isolateModules(() => {
      require('../useNotifications');
    });
    const { setNotificationHandler } = jest.requireMock('expo-notifications');
    const { handleNotification } = setNotificationHandler.mock.calls[0][0];

    expect(await handleNotification()).toEqual({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    });
  });

  it('mounts without throwing', () => {
    expect(() => {
      renderHook(() => useNotifications(), { wrapper: queryWrapper() });
    }).not.toThrow();
  });

  it('registers push token on mount when permissions are granted', async () => {
    renderHook(() => useNotifications(), { wrapper: queryWrapper() });
    await new Promise((r) => setTimeout(r, 50));

    expect(mockGetPermissions).toHaveBeenCalled();
    expect(mockRunSafeWrite).toHaveBeenCalledWith(expect.anything(), PUSH_TOKEN_WRITE, { token: 'ExponentPushToken[test-token]', platform: 'expo' });
  });

  it('does not register token when permission is denied', async () => {
    mockGetPermissions.mockResolvedValue({ status: 'denied' });
    mockRequestPermissions.mockResolvedValue({ status: 'denied' });

    renderHook(() => useNotifications(), { wrapper: queryWrapper() });
    await new Promise((r) => setTimeout(r, 50));

    expect(mockRunSafeWrite).not.toHaveBeenCalled();
  });

  it('does not crash when getExpoPushTokenAsync throws', async () => {
    mockGetToken.mockRejectedValue(new Error('Simulator: push not supported'));

    renderHook(() => useNotifications(), { wrapper: queryWrapper() });
    await new Promise((r) => setTimeout(r, 50));

    // registerPushToken should not have been called
    expect(mockRunSafeWrite).not.toHaveBeenCalled();
  });

  it('does not throw if token registration fails', async () => {
    mockGetToken.mockRejectedValue(new Error('Network error'));

    await expect(
      new Promise<void>((resolve) => {
        renderHook(() => useNotifications(), { wrapper: queryWrapper() });
        setTimeout(resolve, 50);
      })
    ).resolves.not.toThrow();
  });

  it('logs a breadcrumb when the token step fails', async () => {
    mockGetToken.mockRejectedValue(new Error('Network error'));

    renderHook(() => useNotifications(), { wrapper: queryWrapper() });
    await new Promise((r) => setTimeout(r, 50));

    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'push', message: 'Push token registration failed' }),
    );
  });

  it('logs a breadcrumb instead of an unhandled rejection when the permission check rejects', async () => {
    mockGetPermissions.mockRejectedValue(new Error('permissions unavailable'));

    renderHook(() => useNotifications(), { wrapper: queryWrapper() });
    await new Promise((r) => setTimeout(r, 50));

    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'push', message: 'Push registration failed' }),
    );
  });
});
