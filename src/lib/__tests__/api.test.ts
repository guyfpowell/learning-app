import { AxiosHeaders, type AxiosInstance, type AxiosResponse } from 'axios';

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
const mockGetState = jest.fn<
  {
    accessToken: string | null;
    user: { id: string; email: string; name: string } | null;
    clearAuth: typeof mockClearAuth;
    setAuth: typeof mockSetAuth;
  },
  []
>(() => ({
  accessToken: 'test-token',
  user: { id: '1', email: 'test@example.com', name: 'Test' },
  clearAuth: mockClearAuth,
  setAuth: mockSetAuth,
}));

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

const mockQueryClear = jest.fn();
jest.mock('@/providers/QueryProvider', () => ({
  queryClient: { clear: mockQueryClear },
}));

describe('api module', () => {
  const savedDev = __DEV__;
  const savedApiUrl = process.env.EXPO_PUBLIC_API_URL;

  afterEach(() => {
    setDev(savedDev);
    process.env.EXPO_PUBLIC_API_URL = savedApiUrl;
    jest.resetModules();
    jest.clearAllMocks();
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
      mockGetState.mockReturnValueOnce({ accessToken: null, user: null, clearAuth: mockClearAuth, setAuth: mockSetAuth });

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
      expect(mockQueryClear).toHaveBeenCalled();
      expect(mockRouterReplace).toHaveBeenCalledWith('/(auth)/sign-in');
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
