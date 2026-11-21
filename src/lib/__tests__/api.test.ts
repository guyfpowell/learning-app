import { AxiosHeaders, type AxiosError, type AxiosInstance, type AxiosResponse } from 'axios';
import { axiosError, axiosResponse } from '@/test-utils/axios';
import { must } from '@/test-utils/must';
import { BACKGROUND_REQUEST, SKIP_REFRESH_HEADER } from '@/lib/requestHeaders';
import { APP_VERSION_HEADER, CLIENT_HEADER, CLIENT_MOBILE, DEVICE_HEADER, DEVICE_PHONE, DEVICE_TABLET, ERROR_CODES } from '@learning/shared';
import { DeviceType } from '../../../__mocks__/expo-device';

const mockExpoConfig: { hostUri?: string; version?: string; extra: object } = { extra: {} };
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return mockExpoConfig;
    },
  },
}));

const mockClearAuth = jest.fn();
const mockSetAuth = jest.fn();
const signedInState = () => ({
  accessToken: 'test-token' as string | null,
  user: { id: '1', email: 'test@example.com', name: 'Test' } as { id: string; email: string; name: string } | null,
  clearAuth: mockClearAuth,
  setAuth: mockSetAuth,
});
const mockGetState = jest.fn(signedInState);

jest.mock('@/store/auth.store', () => ({
  useAuthStore: { getState: mockGetState },
}));

const mockRequireUpdate = jest.fn();
jest.mock('@/store/appUpdate.store', () => ({
  useAppUpdateStore: { getState: () => ({ require: mockRequireUpdate }) },
}));

jest.mock('react-native', () => ({}));

jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
}));

const mockRouterReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: mockRouterReplace },
}));

const mockQueryClient = { name: 'app query client' };
const mockClearSessionData = jest.fn();
jest.mock('@/lib/offlineWrites', () => ({
  clearSessionData: mockClearSessionData,
}));
jest.mock('@/lib/queryClient', () => ({
  queryClient: mockQueryClient,
}));

describe('api module', () => {
  const savedDev = __DEV__;
  const savedApiUrl = process.env.EXPO_PUBLIC_API_URL;

  afterEach(() => {
    setDev(savedDev);
    process.env.EXPO_PUBLIC_API_URL = savedApiUrl;
    jest.resetModules();
    jest.clearAllMocks();
    mockGetState.mockImplementation(signedInState);
  });

  function fail(message: string): never {
    throw new Error(message);
  }

  function setDev(value: boolean) {
    Object.assign(globalThis, { __DEV__: value });
  }

  // `api.ts` reads the device type when it loads, and `isolateModules` gives it a fresh copy of the
  // expo-device mock, so a type is set inside the isolated registry, before `api.ts` loads.
  function loadApi(deviceType?: number | null): AxiosInstance {
    let api: AxiosInstance | undefined;
    jest.isolateModules(() => {
      if (deviceType !== undefined) require('../../../__mocks__/expo-device').__setDeviceType(deviceType);
      api = require('@/lib/api').default;
    });
    return api ?? fail('@/lib/api did not load');
  }

  // axios keeps its interceptors in a private `handlers` list; take the last one registered.
  function lastInterceptorHandler(manager: unknown, key: 'fulfilled' | 'rejected'): (arg: unknown) => unknown {
    if (typeof manager !== 'object' || manager === null || !('handlers' in manager) || !Array.isArray(manager.handlers)) {
      return fail('axios interceptor manager has no handlers list');
    }
    const handlers: unknown[] = manager.handlers;
    const last = handlers.filter(Boolean).at(-1);
    if (typeof last !== 'object' || last === null || !(key in last)) return fail(`last interceptor has no ${key} handler`);
    const handler = last[key as keyof typeof last];
    if (typeof handler !== 'function') return fail(`last interceptor ${key} is not a function`);
    return (arg) => Reflect.apply(handler, undefined, [arg]);
  }

  function getRequestInterceptorFulfilled(api: AxiosInstance) {
    return lastInterceptorHandler(api.interceptors.request, 'fulfilled');
  }

  function getResponseInterceptorRejected(api: AxiosInstance) {
    return lastInterceptorHandler(api.interceptors.response, 'rejected');
  }

  // ─── Module initialisation ──────────────────────────────────────────────────

  describe('module initialisation', () => {
    it('defaults to localhost:3000 in dev', () => {
      setDev(true);
      delete process.env.EXPO_PUBLIC_API_URL;

      const api = loadApi();

      expect(api.defaults.baseURL).toBe('http://localhost:3000/api');
    });

    it('in dev with no env var, targets the Metro host so a physical phone reaches the Mac', () => {
      setDev(true);
      delete process.env.EXPO_PUBLIC_API_URL;
      mockExpoConfig.hostUri = '192.168.1.130:8081';

      const api = loadApi();

      expect(api.defaults.baseURL).toBe('http://192.168.1.130:3000/api');
      delete mockExpoConfig.hostUri;
    });

    it('uses EXPO_PUBLIC_API_URL when set', () => {
      setDev(true);
      process.env.EXPO_PUBLIC_API_URL = 'https://custom.api.com/api';

      const api = loadApi();

      expect(api.defaults.baseURL).toBe('https://custom.api.com/api');
    });

    it('throws in production when URL is localhost', () => {
      setDev(false);
      delete process.env.EXPO_PUBLIC_API_URL;

      expect(() => {
        jest.isolateModules(() => { require('@/lib/api'); });
      }).toThrow('[api] EXPO_PUBLIC_API_URL is not set or is localhost');
    });
  });

  // ─── Request interceptor ─────────────────────────────────────────────────────

  describe('request interceptor', () => {
    it('injects Bearer token from auth store', () => {
      setDev(true);
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000/api';

      const api = loadApi();

      const config = { headers: {} };
      const fulfilled = getRequestInterceptorFulfilled(api);
      fulfilled(config);

      expect(config.headers).toMatchObject({ Authorization: 'Bearer test-token' });
    });

    // 105i: the server keeps one session each for web, phone and tablet, so every request says which it is.
    describe('which kind of device (105i)', () => {
      function headersSent(deviceType: number | null): Record<string, string> {
        setDev(true);
        process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000/api';
        const api = loadApi(deviceType);
        const config = { headers: {} as Record<string, string> };
        getRequestInterceptorFulfilled(api)(config);
        return config.headers;
      }

      it('sends X-Device: tablet on a tablet, beside X-Client: mobile', () => {
        expect(headersSent(DeviceType.TABLET)).toMatchObject({ [CLIENT_HEADER]: CLIENT_MOBILE, [DEVICE_HEADER]: DEVICE_TABLET });
      });

      it('sends X-Device: phone on a phone', () => {
        expect(headersSent(DeviceType.PHONE)).toMatchObject({ [CLIENT_HEADER]: CLIENT_MOBILE, [DEVICE_HEADER]: DEVICE_PHONE });
      });

      it.each([['unknown', DeviceType.UNKNOWN], ['not yet known', null]])('counts an %s type as a phone', (_name, type) => {
        expect(headersSent(type)).toMatchObject({ [DEVICE_HEADER]: DEVICE_PHONE });
      });
    });

    // 128b, ADR-023 Decision 1: the version of the code that's running, read from the bundle's Expo config.
    describe('which version of the app (128b)', () => {
      function headersSent(): Record<string, string> {
        setDev(true);
        process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000/api';
        const config = { headers: {} as Record<string, string> };
        getRequestInterceptorFulfilled(loadApi())(config);
        return config.headers;
      }

      afterEach(() => { delete mockExpoConfig.version; });

      it('sends the running version beside X-Client', () => {
        mockExpoConfig.version = '1.4.2';
        expect(headersSent()).toMatchObject({ [CLIENT_HEADER]: CLIENT_MOBILE, [APP_VERSION_HEADER]: '1.4.2' });
      });

      it('sends no version when the config has none, so the server counts it as the oldest', () => {
        expect(headersSent()[APP_VERSION_HEADER]).toBeUndefined();
      });
    });

    it('does not inject Authorization when no token', () => {
      setDev(true);
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000/api';
      mockGetState.mockReturnValue({ accessToken: null, user: null, clearAuth: mockClearAuth, setAuth: mockSetAuth });

      const api = loadApi();

      const config = { headers: {} as Record<string, string> };
      const fulfilled = getRequestInterceptorFulfilled(api);
      fulfilled(config);

      expect(config.headers.Authorization).toBeUndefined();
    });
  });

  // ─── Response interceptor ────────────────────────────────────────────────────

  describe('response interceptor — 401 handling', () => {
    const URLS = ['/lessons/1', '/lessons/2'] as const;

    /** A 401 on `url`, as axios rejects it; `background` marks it the way `BACKGROUND_REQUEST` does. */
    function unauthorized(url: string, background = false): AxiosError {
      const headers = new AxiosHeaders(background ? { ...BACKGROUND_REQUEST.headers } : {});
      return axiosError('ERR_BAD_REQUEST', 401, null, { url, headers });
    }

    function sentToken(error: AxiosError): unknown {
      return must(error.config, 'the failed call\'s config').headers.Authorization;
    }

    function loadSignedInApi(): AxiosInstance {
      setDev(true);
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000/api';
      return loadApi();
    }

    /** The refresh call stays open until the test settles it, so several 401s can wait on it. */
    function holdRefresh(api: AxiosInstance) {
      const refresh = { fail: (_err: AxiosError) => {} };
      jest.spyOn(api, 'post').mockReturnValue(new Promise((_resolve, reject) => { refresh.fail = reject; }));
      return refresh;
    }

    it('refreshes via the httpOnly cookie (no body) and resends the call with the new token', async () => {
      const api = loadSignedInApi();
      jest.spyOn(api, 'post').mockResolvedValue(axiosResponse({ token: 'new-access-token' }));
      jest.spyOn(api, 'request').mockResolvedValue(axiosResponse('ok'));
      const error = unauthorized(URLS[0]);

      await expect(getResponseInterceptorRejected(api)(error)).resolves.toEqual(axiosResponse('ok'));

      expect(api.post).toHaveBeenCalledWith('/auth/refresh', undefined, { headers: { [SKIP_REFRESH_HEADER]: 'true' } });
      expect(sentToken(error)).toBe('Bearer new-access-token');
      expect(mockClearAuth).not.toHaveBeenCalled();
    });

    it('resends every call waiting on one refresh with the new token', async () => {
      const api = loadSignedInApi();
      const refresh = { succeed: (_res: AxiosResponse) => {} };
      jest.spyOn(api, 'post').mockReturnValue(new Promise((resolve) => { refresh.succeed = resolve; }));
      jest.spyOn(api, 'request').mockResolvedValue(axiosResponse('ok'));
      const errors = URLS.map((url) => unauthorized(url));

      const calls = errors.map((error) => getResponseInterceptorRejected(api)(error));
      refresh.succeed(axiosResponse({ token: 'new-access-token' }));

      await expect(Promise.all(calls)).resolves.toEqual([axiosResponse('ok'), axiosResponse('ok')]);
      expect(api.post).toHaveBeenCalledTimes(1);
      expect(errors.map(sentToken)).toEqual(['Bearer new-access-token', 'Bearer new-access-token']);
    });

    it.each([401, 403])('a 401, then the refresh gets a %i: sign-out, and the call rejects with its own error', async (status) => {
      const api = loadSignedInApi();
      jest.spyOn(api, 'post').mockRejectedValue(axiosError('ERR_BAD_REQUEST', status));
      const error = unauthorized(URLS[0]);

      await expect(getResponseInterceptorRejected(api)(error)).rejects.toBe(error);
      expect(mockClearAuth).toHaveBeenCalled();
      expect(mockClearSessionData).toHaveBeenCalledWith(mockQueryClient);
      expect(mockRouterReplace).toHaveBeenCalledWith('/(auth)/sign-in');
    });

    it('does NOT sign out when a background request 401s and the refresh is refused', async () => {
      const api = loadSignedInApi();
      jest.spyOn(api, 'post').mockRejectedValue(axiosError('ERR_BAD_REQUEST', 401));
      const error = unauthorized('/users/profile', true);

      await expect(getResponseInterceptorRejected(api)(error)).rejects.toBe(error);
      expect(mockClearAuth).not.toHaveBeenCalled();
    });

    it('two calls waiting on one refresh the server refuses: each rejects with its own error, and one sign-out', async () => {
      const api = loadSignedInApi();
      const refresh = holdRefresh(api);
      const errors = URLS.map((url) => unauthorized(url));

      const calls = errors.map((error) => getResponseInterceptorRejected(api)(error));
      refresh.fail(axiosError('ERR_BAD_REQUEST', 401));

      await expect(calls[0]).rejects.toBe(errors[0]);
      await expect(calls[1]).rejects.toBe(errors[1]);
      expect(mockClearAuth).toHaveBeenCalledTimes(1);
    });

    // A background call never decides the session is over, but a foreground call waiting on the
    // same refused refresh does: without that, the person stays signed in on a dead session.
    it('a background call starts the refresh, a foreground call waits, the server refuses: one sign-out', async () => {
      const api = loadSignedInApi();
      const refresh = holdRefresh(api);
      const background = unauthorized('/users/profile', true);
      const foreground = unauthorized(URLS[0]);

      const calls = [background, foreground].map((error) => getResponseInterceptorRejected(api)(error));
      refresh.fail(axiosError('ERR_BAD_REQUEST', 401));

      await expect(calls[0]).rejects.toBe(background);
      await expect(calls[1]).rejects.toBe(foreground);
      expect(mockClearAuth).toHaveBeenCalledTimes(1);
      expect(mockRouterReplace).toHaveBeenCalledWith('/(auth)/sign-in');
    });

    // Only a refusal from the server signs the person out (ADR-021 Decision 1).
    describe('a refresh that does not get a refusal', () => {
      it.each([
        ['times out', axiosError('ECONNABORTED')],
        ['gets a 5xx', axiosError('ERR_BAD_RESPONSE', 503)],
        ['gets a 429', axiosError('ERR_BAD_REQUEST', 429)],
      ])('a 401, then the refresh %s: no sign-out, and the call rejects with that error', async (_name, failure) => {
        const api = loadSignedInApi();
        jest.spyOn(api, 'post').mockRejectedValue(failure);

        await expect(getResponseInterceptorRejected(api)(unauthorized(URLS[0]))).rejects.toBe(failure);
        expect(mockClearAuth).not.toHaveBeenCalled();
        expect(mockClearSessionData).not.toHaveBeenCalled();
        expect(mockRouterReplace).not.toHaveBeenCalled();
      });

      it('two calls waiting on one refresh that fails for a network reason: both reject, no sign-out', async () => {
        const api = loadSignedInApi();
        const refresh = holdRefresh(api);
        const timeout = axiosError('ECONNABORTED');

        const calls = URLS.map((url) => getResponseInterceptorRejected(api)(unauthorized(url)));
        refresh.fail(timeout);

        await expect(calls[0]).rejects.toBe(timeout);
        await expect(calls[1]).rejects.toBe(timeout);
        expect(mockClearAuth).not.toHaveBeenCalled();
        expect(mockRouterReplace).not.toHaveBeenCalled();
      });

      it('after a failed refresh, the next 401 starts a new refresh', async () => {
        const api = loadSignedInApi();
        const timeout = axiosError('ECONNABORTED');
        const post = jest.spyOn(api, 'post').mockRejectedValue(timeout);
        jest.spyOn(api, 'request').mockResolvedValue(axiosResponse('ok'));

        const rejected = getResponseInterceptorRejected(api);
        await expect(rejected(unauthorized(URLS[0]))).rejects.toBe(timeout);
        post.mockResolvedValue(axiosResponse({ token: 'new-access-token' }));

        await expect(rejected(unauthorized(URLS[1]))).resolves.toEqual(axiosResponse('ok'));
      });
    });

    it('passes a 401 from an /auth/ endpoint straight to the caller (wrong credentials)', async () => {
      const api = loadSignedInApi();
      const error = unauthorized('/auth/login');

      await expect(getResponseInterceptorRejected(api)(error)).rejects.toBe(error);
      expect(mockClearAuth).not.toHaveBeenCalled();
      expect(mockRouterReplace).not.toHaveBeenCalled();
    });

    it('passes network errors through without refreshing or signing out', async () => {
      const api = loadSignedInApi();
      const post = jest.spyOn(api, 'post');
      const error = axiosError('ECONNABORTED');

      await expect(getResponseInterceptorRejected(api)(error)).rejects.toBe(error);
      expect(post).not.toHaveBeenCalled();
      expect(mockClearAuth).not.toHaveBeenCalled();
    });
  });

  // ─── 426: the app must update (128b, ADR-023 Decision 4) ─────────────────────

  describe('response interceptor — 426 APP_UPDATE_REQUIRED', () => {
    function loadSignedInApi(): AxiosInstance {
      setDev(true);
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000/api';
      return loadApi();
    }

    function failed(url: string, status: number, code: string): AxiosError {
      return axiosError('ERR_BAD_REQUEST', status, { code }, { url, headers: new AxiosHeaders() });
    }

    it('shows the update screen and rejects with the same error', async () => {
      const api = loadSignedInApi();
      const error = failed('/lessons/1', 426, ERROR_CODES.APP_UPDATE_REQUIRED);

      await expect(getResponseInterceptorRejected(api)(error)).rejects.toBe(error);
      expect(mockRequireUpdate).toHaveBeenCalledTimes(1);
      expect(mockClearAuth).not.toHaveBeenCalled();
    });

    it('a 426 from /auth/refresh shows the screen and signs nobody out', async () => {
      const api = loadSignedInApi();
      const error = failed('/auth/refresh', 426, ERROR_CODES.APP_UPDATE_REQUIRED);

      await expect(getResponseInterceptorRejected(api)(error)).rejects.toBe(error);
      expect(mockRequireUpdate).toHaveBeenCalled();
      expect(mockClearAuth).not.toHaveBeenCalled();
      expect(mockRouterReplace).not.toHaveBeenCalled();
    });

    it('a 401 whose refresh gets a 426 does not sign out, and the call rejects with that error', async () => {
      const api = loadSignedInApi();
      const refreshFailure = failed('/auth/refresh', 426, ERROR_CODES.APP_UPDATE_REQUIRED);
      jest.spyOn(api, 'post').mockRejectedValue(refreshFailure);

      await expect(getResponseInterceptorRejected(api)(failed('/lessons/1', 401, ERROR_CODES.AUTH_SESSION_EXPIRED))).rejects.toBe(refreshFailure);
      expect(mockClearAuth).not.toHaveBeenCalled();
      expect(mockClearSessionData).not.toHaveBeenCalled();
      expect(mockRouterReplace).not.toHaveBeenCalled();
    });

    it.each([
      ['another 4xx', failed('/lessons/1', 409, ERROR_CODES.LESSON_ALREADY_COMPLETED)],
      ['a 426 with another code', failed('/lessons/1', 426, ERROR_CODES.LESSON_ALREADY_COMPLETED)],
      ['a 5xx', axiosError('ERR_BAD_RESPONSE', 503)],
      ['a timeout', axiosError('ECONNABORTED')],
    ])('%s does not show the screen', async (_name, error) => {
      const api = loadSignedInApi();

      await expect(getResponseInterceptorRejected(api)(error)).rejects.toBe(error);
      expect(mockRequireUpdate).not.toHaveBeenCalled();
    });
  });
});
