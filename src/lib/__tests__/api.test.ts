// Mock the auth store so the api module can load without real SecureStore
jest.mock('@/store/auth.store', () => ({
  useAuthStore: {
    getState: jest.fn(() => ({
      accessToken: 'test-token',
      refreshToken: 'refresh-token',
      user: { id: '1', email: 'test@example.com' },
      setAuth: jest.fn(),
      clearAuth: jest.fn(),
    })),
  },
}));

describe('api module', () => {
  const savedDev = (global as any).__DEV__;
  const savedApiUrl = process.env.EXPO_PUBLIC_API_URL;

  afterEach(() => {
    (global as any).__DEV__ = savedDev;
    process.env.EXPO_PUBLIC_API_URL = savedApiUrl;
    jest.resetModules();
  });

  // Helper: get the fulfilled handler of the last registered request interceptor
  function getRequestInterceptorFulfilled(api: any): (config: any) => any {
    const handlers = (api.interceptors.request as any).handlers as Array<{
      fulfilled: (config: any) => any;
    } | null>;
    const active = handlers.filter(Boolean);
    return active[active.length - 1]!.fulfilled;
  }

  // ─── Module initialisation ──────────────────────────────────────────────────

  describe('module initialisation', () => {
    it('exports a defined Axios instance with an http:// URL in production (no module crash)', () => {
      (global as any).__DEV__ = false;
      process.env.EXPO_PUBLIC_API_URL = 'http://192.168.1.1:4000/api';

      let api: any;
      jest.isolateModules(() => {
        api = require('@/lib/api').default;
      });

      expect(api).toBeDefined();
      expect(typeof api.get).toBe('function');
    });

    it('exports a defined Axios instance with an https:// URL in production', () => {
      (global as any).__DEV__ = false;
      process.env.EXPO_PUBLIC_API_URL = 'https://api.pocketchange.app/api';

      let api: any;
      jest.isolateModules(() => {
        api = require('@/lib/api').default;
      });

      expect(api).toBeDefined();
    });

    it('exports a defined Axios instance in dev mode with an http:// URL', () => {
      (global as any).__DEV__ = true;
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:4000/api';

      let api: any;
      jest.isolateModules(() => {
        api = require('@/lib/api').default;
      });

      expect(api).toBeDefined();
    });
  });

  // ─── Request interceptor — HTTPS enforcement ────────────────────────────────

  describe('request interceptor — HTTPS enforcement', () => {
    it('rejects the request with a clear error in production when API URL is http://', async () => {
      (global as any).__DEV__ = false;
      process.env.EXPO_PUBLIC_API_URL = 'http://192.168.1.1:4000/api';

      let api: any;
      jest.isolateModules(() => {
        api = require('@/lib/api').default;
      });

      const fulfilled = getRequestInterceptorFulfilled(api);
      await expect(fulfilled({ url: '/test', headers: {} })).rejects.toThrow(
        /[Ii]nsecure API URL/
      );
    });

    it('passes requests through in production when API URL is https://', async () => {
      (global as any).__DEV__ = false;
      process.env.EXPO_PUBLIC_API_URL = 'https://api.pocketchange.app/api';

      let api: any;
      jest.isolateModules(() => {
        api = require('@/lib/api').default;
      });

      const fulfilled = getRequestInterceptorFulfilled(api);
      const config = { url: '/test', headers: {} };
      const result = await Promise.resolve(fulfilled(config));
      expect(result).toMatchObject({ url: '/test' });
    });

    it('passes requests through in dev mode with an http:// URL', async () => {
      (global as any).__DEV__ = true;
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:4000/api';

      let api: any;
      jest.isolateModules(() => {
        api = require('@/lib/api').default;
      });

      const fulfilled = getRequestInterceptorFulfilled(api);
      const config = { url: '/test', headers: {} };
      const result = await Promise.resolve(fulfilled(config));
      expect(result).toMatchObject({ url: '/test' });
    });
  });

  // ─── Request interceptor — token injection ──────────────────────────────────

  describe('request interceptor — token injection', () => {
    it('injects the Bearer token from the auth store', async () => {
      (global as any).__DEV__ = true;
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:4000/api';

      let api: any;
      jest.isolateModules(() => {
        api = require('@/lib/api').default;
      });

      const fulfilled = getRequestInterceptorFulfilled(api);
      const config = { url: '/test', headers: {} as Record<string, string> };
      const result = await fulfilled(config);
      expect(result.headers.Authorization).toBe('Bearer test-token');
    });

    it('does not inject Authorization header when no access token', async () => {
      (global as any).__DEV__ = true;
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:4000/api';

      const { useAuthStore } = require('@/store/auth.store');
      useAuthStore.getState.mockReturnValueOnce({
        accessToken: null,
        refreshToken: null,
        user: null,
        setAuth: jest.fn(),
        clearAuth: jest.fn(),
      });

      let api: any;
      jest.isolateModules(() => {
        api = require('@/lib/api').default;
      });

      const fulfilled = getRequestInterceptorFulfilled(api);
      const config = { url: '/test', headers: {} as Record<string, string> };
      const result = await fulfilled(config);
      expect(result.headers.Authorization).toBeUndefined();
    });
  });
});
