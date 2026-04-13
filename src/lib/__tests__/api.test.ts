jest.mock('expo-constants', () => ({
  default: { expoConfig: { extra: {} } },
}));

const mockClearAuth = jest.fn();
const mockGetState = jest.fn(() => ({
  accessToken: 'test-token',
  user: { id: '1', email: 'test@example.com', name: 'Test' },
  clearAuth: mockClearAuth,
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
  const savedDev = (global as any).__DEV__;
  const savedApiUrl = process.env.EXPO_PUBLIC_API_URL;

  afterEach(() => {
    (global as any).__DEV__ = savedDev;
    process.env.EXPO_PUBLIC_API_URL = savedApiUrl;
    jest.resetModules();
    jest.clearAllMocks();
  });

  function getRequestInterceptorFulfilled(api: any) {
    const handlers = (api.interceptors.request as any).handlers as Array<{ fulfilled: (c: any) => any } | null>;
    return handlers.filter(Boolean).at(-1)!.fulfilled;
  }

  function getResponseInterceptorRejected(api: any) {
    const handlers = (api.interceptors.response as any).handlers as Array<{ rejected: (e: any) => any } | null>;
    return handlers.filter(Boolean).at(-1)!.rejected;
  }

  // ─── Module initialisation ──────────────────────────────────────────────────

  describe('module initialisation', () => {
    it('defaults to localhost:3000 in dev', () => {
      (global as any).__DEV__ = true;
      delete process.env.EXPO_PUBLIC_API_URL;

      let api: any;
      jest.isolateModules(() => { api = require('@/lib/api').default; });

      expect(api.defaults.baseURL).toBe('http://localhost:3000/api');
    });

    it('uses EXPO_PUBLIC_API_URL when set', () => {
      (global as any).__DEV__ = true;
      process.env.EXPO_PUBLIC_API_URL = 'https://custom.api.com/api';

      let api: any;
      jest.isolateModules(() => { api = require('@/lib/api').default; });

      expect(api.defaults.baseURL).toBe('https://custom.api.com/api');
    });

    it('throws in production when URL is localhost', () => {
      (global as any).__DEV__ = false;
      delete process.env.EXPO_PUBLIC_API_URL;

      expect(() => {
        jest.isolateModules(() => { require('@/lib/api'); });
      }).toThrow('[api] EXPO_PUBLIC_API_URL is not set or is localhost');
    });
  });

  // ─── Request interceptor ─────────────────────────────────────────────────────

  describe('request interceptor', () => {
    it('injects Bearer token from auth store', () => {
      (global as any).__DEV__ = true;
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000/api';

      let api: any;
      jest.isolateModules(() => { api = require('@/lib/api').default; });

      const config = { headers: {} };
      const fulfilled = getRequestInterceptorFulfilled(api);
      fulfilled(config);

      expect(config.headers).toMatchObject({ Authorization: 'Bearer test-token' });
    });

    it('does not inject Authorization when no token', () => {
      (global as any).__DEV__ = true;
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000/api';
      mockGetState.mockReturnValueOnce({ accessToken: null, user: null, clearAuth: mockClearAuth });

      let api: any;
      jest.isolateModules(() => { api = require('@/lib/api').default; });

      const config = { headers: {} as Record<string, string> };
      const fulfilled = getRequestInterceptorFulfilled(api);
      fulfilled(config);

      expect(config.headers.Authorization).toBeUndefined();
    });
  });

  // ─── Response interceptor ────────────────────────────────────────────────────

  describe('response interceptor — 401 handling', () => {
    it('clears auth and redirects to sign-in on 401 from non-auth endpoint', async () => {
      (global as any).__DEV__ = true;
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000/api';
      mockGetState.mockReturnValue({
        accessToken: 'tok',
        user: { id: '1', email: 'test@example.com', name: 'Test' },
        clearAuth: mockClearAuth,
      });

      let api: any;
      jest.isolateModules(() => { api = require('@/lib/api').default; });

      const rejected = getResponseInterceptorRejected(api);
      const error = { response: { status: 401 }, config: { url: '/lessons/1' }, code: 'ERR_BAD_REQUEST' };

      await expect(rejected(error)).rejects.toEqual(error);
      expect(mockClearAuth).toHaveBeenCalled();
      expect(mockQueryClear).toHaveBeenCalled();
      expect(mockRouterReplace).toHaveBeenCalledWith('/(auth)/sign-in');
    });

    it('passes 401 from /auth/ endpoint directly to caller (wrong credentials)', async () => {
      (global as any).__DEV__ = true;
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000/api';

      let api: any;
      jest.isolateModules(() => { api = require('@/lib/api').default; });

      const rejected = getResponseInterceptorRejected(api);
      const error = { response: { status: 401 }, config: { url: '/auth/login' }, code: 'ERR_BAD_REQUEST' };

      await expect(rejected(error)).rejects.toEqual(error);
      expect(mockClearAuth).not.toHaveBeenCalled();
      expect(mockRouterReplace).not.toHaveBeenCalled();
    });

    it('passes through network errors without triggering logout', async () => {
      (global as any).__DEV__ = true;
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000/api';

      let api: any;
      jest.isolateModules(() => { api = require('@/lib/api').default; });

      const rejected = getResponseInterceptorRejected(api);
      const error = { code: 'ECONNABORTED' };

      await expect(rejected(error)).rejects.toEqual(error);
      expect(mockClearAuth).not.toHaveBeenCalled();
    });
  });
});
