import { renderHook } from '@testing-library/react-native';
import { useNotifications } from '../useNotifications';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { registerPushToken } from '@/lib/api';

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

jest.mock('@/lib/api', () => ({
  registerPushToken: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

const mockRegisterPushToken = registerPushToken as jest.Mock;
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
    (Device as unknown as Record<string, unknown>).isDevice = true;
  });

  it('mounts without throwing', () => {
    expect(() => {
      renderHook(() => useNotifications());
    }).not.toThrow();
  });

  it('registers push token on mount when permissions are granted', async () => {
    renderHook(() => useNotifications());
    await new Promise((r) => setTimeout(r, 50));

    expect(mockGetPermissions).toHaveBeenCalled();
    expect(mockRegisterPushToken).toHaveBeenCalledWith('ExponentPushToken[test-token]', 'expo');
  });

  it('does not register token when permission is denied', async () => {
    mockGetPermissions.mockResolvedValue({ status: 'denied' });
    mockRequestPermissions.mockResolvedValue({ status: 'denied' });

    renderHook(() => useNotifications());
    await new Promise((r) => setTimeout(r, 50));

    expect(mockRegisterPushToken).not.toHaveBeenCalled();
  });

  it('does not crash when getExpoPushTokenAsync throws', async () => {
    mockGetToken.mockRejectedValue(new Error('Simulator: push not supported'));

    renderHook(() => useNotifications());
    await new Promise((r) => setTimeout(r, 50));

    // registerPushToken should not have been called
    expect(mockRegisterPushToken).not.toHaveBeenCalled();
  });

  it('does not throw if token registration fails', async () => {
    mockGetToken.mockRejectedValue(new Error('Network error'));

    await expect(
      new Promise<void>((resolve) => {
        renderHook(() => useNotifications());
        setTimeout(resolve, 50);
      })
    ).resolves.not.toThrow();
  });
});
