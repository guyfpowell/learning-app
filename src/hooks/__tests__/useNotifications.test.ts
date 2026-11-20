import { renderHook } from '@testing-library/react-native';
import type { QueryClient } from '@tanstack/react-query';
import { useNotifications } from '../useNotifications';
import * as Notifications from 'expo-notifications';
import * as Sentry from '@sentry/react-native';
import { PUSH_TOKEN_WRITE, runSafeWrite } from '@/lib/safeWrites';
import { createTestQueryClient, queryWrapper } from '@/test-utils/queryClient';
import { setShownBuildId } from '@/lib/shownBuild';
import { UNSEEN_BUILDS_QUERY_KEY, trackBuildQueryKey } from '@/lib/queryKeys';
import { HOME_ROUTE, PROGRESS_ROUTE, WEEK_ROUTE, buildRoute } from '@/lib/routes';
import { PUSH_SCREEN, TRACK_BUILD_STATUS, type TrackBuildPushData, type WeeklyRecapPushData } from '@learning/shared';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'ExponentPushToken[test-token]' })),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponse: jest.fn(() => null),
  AndroidImportance: { MAX: 5 },
}));

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, replace: mockReplace }) }));

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

const addReceived = Notifications.addNotificationReceivedListener as jest.Mock;
const addResponse = Notifications.addNotificationResponseReceivedListener as jest.Mock;
const getLastResponse = Notifications.getLastNotificationResponse as jest.Mock;

/** A push as the handler and listeners see it; `data` is what the server sent. */
function pushOf(data: unknown, identifier = 'push-0') {
  return { request: { identifier, content: { data } } };
}
const buildPush = (buildId: string, identifier: string) => pushOf({ buildId, state: TRACK_BUILD_STATUS.done } satisfies TrackBuildPushData, identifier);

describe('useNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setShownBuildId(null);
    getLastResponse.mockReturnValue(null);
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

    expect(await handleNotification(pushOf({ some: 'other push' }))).toEqual({
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

describe('a finished build push (ticket 108)', () => {
  const FOREGROUND_SHOWN = { shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true };
  const FOREGROUND_HIDDEN = { shouldShowAlert: false, shouldPlaySound: false, shouldSetBadge: false, shouldShowBanner: false, shouldShowList: false };

  beforeEach(() => {
    jest.clearAllMocks();
    setShownBuildId(null);
    getLastResponse.mockReturnValue(null);
  });

  /** The handler of a fresh module copy, so `shownId` is set on the copy it reads. */
  async function handlerResult(notification: ReturnType<typeof pushOf>, shownId: string) {
    jest.isolateModules(() => {
      require('@/lib/shownBuild').setShownBuildId(shownId);
      require('../useNotifications');
    });
    const { setNotificationHandler } = jest.requireMock('expo-notifications');
    return setNotificationHandler.mock.calls[0][0].handleNotification(notification);
  }

  function mount(client: QueryClient = createTestQueryClient()) {
    renderHook(() => useNotifications(), { wrapper: queryWrapper(client) });
    return client;
  }

  it('is displayed when the build screen is not showing that build', async () => {
    expect(await handlerResult(buildPush('b1', 'p1'), 'other')).toEqual(FOREGROUND_SHOWN);
  });

  it('is not displayed when the build screen is showing that build', async () => {
    expect(await handlerResult(buildPush('b1', 'p2'), 'b1')).toEqual(FOREGROUND_HIDDEN);
  });

  it('refreshes the unseen builds and that build when it arrives while the app is open', () => {
    const client = mount();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    addReceived.mock.calls[0][0](buildPush('b1', 'p3'));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: UNSEEN_BUILDS_QUERY_KEY });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: trackBuildQueryKey('b1') });
  });

  it('removes both listeners when it unmounts', () => {
    const { unmount } = renderHook(() => useNotifications(), { wrapper: queryWrapper() });
    unmount();
    expect(addReceived.mock.results[0]?.value.remove).toHaveBeenCalled();
    expect(addResponse.mock.results[0]?.value.remove).toHaveBeenCalled();
  });

  it('leaves the unseen builds alone for any other push', () => {
    const client = mount();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    addReceived.mock.calls[0][0](pushOf({ type: 'reminder' }, 'p4'));
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('opens that build when tapped, and refreshes what it affects', () => {
    const client = mount();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    addResponse.mock.calls[0][0]({ notification: buildPush('b1', 'p5') });
    expect(mockPush).toHaveBeenCalledWith(buildRoute('b1'));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: UNSEEN_BUILDS_QUERY_KEY });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: trackBuildQueryKey('b1') });
  });

  it('opens nothing when tapped on a push that is not about a build', () => {
    mount();
    addResponse.mock.calls[0][0]({ notification: pushOf({ type: 'reminder' }, 'p6') });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('does not open the build the screen is already showing', () => {
    setShownBuildId('b1');
    mount();
    addResponse.mock.calls[0][0]({ notification: buildPush('b1', 'p7') });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('opens the build of the tap that launched the app, once', () => {
    getLastResponse.mockReturnValue({ notification: buildPush('b2', 'p8') });
    mount();
    mount();
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(buildRoute('b2'));
  });
});

describe('the Sunday recap push (124ae)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getLastResponse.mockReturnValue(null);
  });

  it('opens the week when tapped', () => {
    renderHook(() => useNotifications(), { wrapper: queryWrapper(createTestQueryClient()) });
    addResponse.mock.calls[0][0]({ notification: pushOf({ screen: PUSH_SCREEN.week } satisfies WeeklyRecapPushData, 'recap-1') });
    expect(mockPush).toHaveBeenCalledWith(WEEK_ROUTE);
  });

  it('opens the week of the tap that launched the app, once', () => {
    getLastResponse.mockReturnValue({ notification: pushOf({ screen: PUSH_SCREEN.week } satisfies WeeklyRecapPushData, 'recap-2') });
    renderHook(() => useNotifications(), { wrapper: queryWrapper(createTestQueryClient()) });
    renderHook(() => useNotifications(), { wrapper: queryWrapper(createTestQueryClient()) });
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(WEEK_ROUTE);
  });
});

describe('the one tap handler for every push', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setShownBuildId(null);
    getLastResponse.mockReturnValue(null);
  });

  const tap = (data: unknown, identifier: string) => {
    renderHook(() => useNotifications(), { wrapper: queryWrapper(createTestQueryClient()) });
    addResponse.mock.calls[0][0]({ notification: pushOf(data, identifier) });
  };

  it.each([
    ['a lesson reminder', { screen: PUSH_SCREEN.lessons }, 'tab-1', HOME_ROUTE],
    ['a push naming no screen', {}, 'tab-2', HOME_ROUTE],
    ['a streak milestone', { screen: PUSH_SCREEN.progress }, 'tab-3', PROGRESS_ROUTE],
  ])('takes %s to its tab', (_name, data, identifier, route) => {
    tap(data, identifier);
    expect(mockReplace.mock.calls).toEqual([[route]]);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('opens only the build for a build push, never Home first', () => {
    tap({ buildId: 'b9', state: TRACK_BUILD_STATUS.done } satisfies TrackBuildPushData, 'build-9');
    expect(mockPush.mock.calls).toEqual([[buildRoute('b9')]]);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('opens only the week for the recap, never Home first', () => {
    tap({ screen: PUSH_SCREEN.week } satisfies WeeklyRecapPushData, 'recap-9');
    expect(mockPush.mock.calls).toEqual([[WEEK_ROUTE]]);
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
