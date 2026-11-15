import { AxiosError, AxiosHeaders, type AxiosInstance, type AxiosResponse } from 'axios';

const mockExpoConfig: { hostUri?: string; extra: object } = { extra: {} };
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
  isRetryableWriteError: jest.requireActual('@/lib/offlineWrites').isRetryableWriteError,
}));
jest.mock('@/providers/QueryProvider', () => ({
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

  function loadApi(): AxiosInstance {
    let api: AxiosInstance | undefined;
    jest.isolateModules(() => { api = require('@/lib/api').default; });
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

  function axiosResponse<T>(data: T): AxiosResponse<T> {
    return { data, status: 200, statusText: 'OK', headers: {}, config: { headers: new AxiosHeaders() } };
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
    // 069 A1 — syncTimezone() on register was signing brand-new users out.
    it('does NOT sign out when a background request 401s and refresh fails', async () => {
      setDev(true);
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000/api';
      mockGetState.mockReturnValue({
        accessToken: 'tok',
        user: { id: '1', email: 'test@example.com', name: 'Test' },
        clearAuth: mockClearAuth,
        setAuth: mockSetAuth,
      });

      const api = loadApi();
      jest.spyOn(api, 'post').mockRejectedValue(new Error('refresh failed'));

      const rejected = getResponseInterceptorRejected(api);
      const error = {
        response: { status: 401 },
        config: { url: '/users/profile', headers: { 'X-Background': 'true' } },
        code: 'ERR_BAD_REQUEST',
      };

      await expect(rejected(error)).rejects.toEqual(error);
      expect(mockClearAuth).not.toHaveBeenCalled();
    });

    it('clears auth and redirects to sign-in on 401 from non-auth endpoint when refresh fails', async () => {
      setDev(true);
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000/api';
      mockGetState.mockReturnValue({
        accessToken: 'tok',
        user: { id: '1', email: 'test@example.com', name: 'Test' },
        clearAuth: mockClearAuth,
        setAuth: mockSetAuth,
      });

      const api = loadApi();
      jest.spyOn(api, 'post').mockRejectedValue(new Error('refresh failed'));

      const rejected = getResponseInterceptorRejected(api);
      const error = { response: { status: 401 }, config: { url: '/lessons/1', headers: {} }, code: 'ERR_BAD_REQUEST' };

      await expect(rejected(error)).rejects.toEqual(error);
      expect(mockClearAuth).toHaveBeenCalled();
      expect(mockClearSessionData).toHaveBeenCalledWith(mockQueryClient);
      expect(mockRouterReplace).toHaveBeenCalledWith('/(auth)/sign-in');
    });

    // 105b — only a refusal from the server signs the person out.
    describe('a refresh that does not reach the server', () => {
      const ORIGINAL_URLS = ['/lessons/1', '/lessons/2'] as const;

      function originalError(url: string) {
        return { response: { status: 401 }, config: { url, headers: {} as Record<string, string> }, code: 'ERR_BAD_REQUEST' };
      }

      function refreshFailure(code: string, status?: number): AxiosError {
        const response = status === undefined ? undefined : { ...axiosResponse(null), status };
        return new AxiosError('refresh failed', code, undefined, undefined, response);
      }

      function loadSignedInApi(): AxiosInstance {
        setDev(true);
        process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000/api';
        return loadApi();
      }

      it('a 401, then the refresh times out: no sign-out, and the call rejects with the network error', async () => {
        const api = loadSignedInApi();
        const timeout = refreshFailure('ECONNABORTED');
        jest.spyOn(api, 'post').mockRejectedValue(timeout);

        const rejected = getResponseInterceptorRejected(api);

        await expect(rejected(originalError(ORIGINAL_URLS[0]))).rejects.toBe(timeout);
        expect(mockClearAuth).not.toHaveBeenCalled();
        expect(mockClearSessionData).not.toHaveBeenCalled();
        expect(mockRouterReplace).not.toHaveBeenCalled();
      });

      it('a 401, then the refresh gets a 5xx: no sign-out', async () => {
        const api = loadSignedInApi();
        const serverError = refreshFailure('ERR_BAD_RESPONSE', 503);
        jest.spyOn(api, 'post').mockRejectedValue(serverError);

        const rejected = getResponseInterceptorRejected(api);

        await expect(rejected(originalError(ORIGINAL_URLS[0]))).rejects.toBe(serverError);
        expect(mockClearAuth).not.toHaveBeenCalled();
        expect(mockRouterReplace).not.toHaveBeenCalled();
      });

      it.each([401, 403])('a 401, then the refresh gets a %i: sign-out, as today', async (status) => {
        const api = loadSignedInApi();
        jest.spyOn(api, 'post').mockRejectedValue(refreshFailure('ERR_BAD_REQUEST', status));

        const rejected = getResponseInterceptorRejected(api);
        const error = originalError(ORIGINAL_URLS[0]);

        await expect(rejected(error)).rejects.toEqual(error);
        expect(mockClearAuth).toHaveBeenCalled();
        expect(mockClearSessionData).toHaveBeenCalledWith(mockQueryClient);
        expect(mockRouterReplace).toHaveBeenCalledWith('/(auth)/sign-in');
      });

      it('two calls waiting on one refresh that fails for a network reason: both reject, no sign-out', async () => {
        const api = loadSignedInApi();
        const timeout = refreshFailure('ECONNABORTED');
        const refresh = { fail: (_err: AxiosError) => {} };
        jest.spyOn(api, 'post').mockReturnValue(new Promise((_resolve, reject) => { refresh.fail = reject; }));

        const rejected = getResponseInterceptorRejected(api);
        const first = rejected(originalError(ORIGINAL_URLS[0]));
        const second = rejected(originalError(ORIGINAL_URLS[1]));
        refresh.fail(timeout);

        await expect(first).rejects.toBe(timeout);
        await expect(second).rejects.toBe(timeout);
        expect(mockClearAuth).not.toHaveBeenCalled();
        expect(mockRouterReplace).not.toHaveBeenCalled();
      });

      it('after a failed refresh, the next 401 starts a new refresh', async () => {
        const api = loadSignedInApi();
        const timeout = refreshFailure('ECONNABORTED');
        const post = jest.spyOn(api, 'post').mockRejectedValue(timeout);
        jest.spyOn(api, 'request').mockResolvedValue(axiosResponse('ok'));

        const rejected = getResponseInterceptorRejected(api);
        await expect(rejected(originalError(ORIGINAL_URLS[0]))).rejects.toBe(timeout);
        post.mockResolvedValue(axiosResponse({ token: 'new-access-token' }));

        await expect(rejected(originalError(ORIGINAL_URLS[1]))).resolves.toEqual(axiosResponse('ok'));
      });
    });

    it('refreshes via the httpOnly cookie (no body) and retries the original request on 401', async () => {
      setDev(true);
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000/api';
      mockGetState.mockReturnValue({
        accessToken: 'expired-tok',
        user: { id: '1', email: 'test@example.com', name: 'Test' },
        clearAuth: mockClearAuth,
        setAuth: mockSetAuth,
      });

      const api = loadApi();
      jest.spyOn(api, 'post').mockResolvedValue(axiosResponse({ token: 'new-access-token' }));
      jest.spyOn(api, 'request').mockResolvedValue(axiosResponse('ok'));

      const rejected = getResponseInterceptorRejected(api);
      const error = { response: { status: 401 }, config: { url: '/lessons/1', headers: {} as Record<string, string> }, code: 'ERR_BAD_REQUEST' };

      await rejected(error);

      expect(api.post).toHaveBeenCalledWith('/auth/refresh', undefined, expect.objectContaining({
        headers: { 'X-Skip-Refresh': 'true' },
      }));
      expect(mockClearAuth).not.toHaveBeenCalled();
      expect(error.config.headers['Authorization']).toBe('Bearer new-access-token');
    });

    it('passes 401 from /auth/ endpoint directly to caller (wrong credentials)', async () => {
      setDev(true);
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000/api';

      const api = loadApi();

      const rejected = getResponseInterceptorRejected(api);
      const error = { response: { status: 401 }, config: { url: '/auth/login' }, code: 'ERR_BAD_REQUEST' };

      await expect(rejected(error)).rejects.toEqual(error);
      expect(mockClearAuth).not.toHaveBeenCalled();
      expect(mockRouterReplace).not.toHaveBeenCalled();
    });

    it('passes through network errors without triggering logout', async () => {
      setDev(true);
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000/api';

      const api = loadApi();

      const rejected = getResponseInterceptorRejected(api);
      const error = { code: 'ECONNABORTED' };

      await expect(rejected(error)).rejects.toEqual(error);
      expect(mockClearAuth).not.toHaveBeenCalled();
    });
  });
});
