// Mock expo-constants so the api module can load without native module setup
// (jest.resetModules + jest.isolateModules would otherwise trigger expo-modules-core native init)
jest.mock('expo-constants', () => ({
  default: { expoConfig: { extra: {} } },
}));

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

// Mock axios.post so refresh calls can be controlled per test
jest.mock('axios', () => {
  const actual = jest.requireActual('axios');
  return { ...actual, post: jest.fn(), create: actual.create.bind(actual) };
});

// Mock react-native — only Alert is used by api.ts
jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
}));

// Mock Sentry
jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
}));

// Mock expo-router imperative router
jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
}));

// Mock QueryProvider singleton
jest.mock('@/providers/QueryProvider', () => ({
  queryClient: { clear: jest.fn() },
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
    it('defaults to production URL when EXPO_PUBLIC_API_URL is unset', () => {
      (global as any).__DEV__ = false;
      delete process.env.EXPO_PUBLIC_API_URL;

      let api: any;
      jest.isolateModules(() => {
        api = require('@/lib/api').default;
      });

      expect(api.defaults.baseURL).toBe('https://pocketchange-backend.onrender.com/api');
    });

    it('throws at module load in production when EXPO_PUBLIC_API_URL is localhost', () => {
      (global as any).__DEV__ = false;
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:4000/api';

      expect(() => {
        jest.isolateModules(() => {
          require('@/lib/api');
        });
      }).toThrow(/EXPO_PUBLIC_API_URL is not set or is localhost/);
    });

    it('does not throw at module load in dev mode when EXPO_PUBLIC_API_URL is localhost', () => {
      (global as any).__DEV__ = true;
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:4000/api';

      let api: any;
      expect(() => {
        jest.isolateModules(() => {
          api = require('@/lib/api').default;
        });
      }).not.toThrow();

      expect(api).toBeDefined();
    });

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

    it('does not use Constants.expoConfig.extra.apiUrl — EXPO_PUBLIC_API_URL is the single resolution point', () => {
      (global as any).__DEV__ = false;
      process.env.EXPO_PUBLIC_API_URL = 'https://pocketchange-backend.onrender.com/api';

      let api: any;
      jest.isolateModules(() => {
        // Override Constants mock to have a conflicting local IP in extra.apiUrl
        jest.doMock('expo-constants', () => ({
          default: { expoConfig: { extra: { apiUrl: 'http://192.168.1.50:4000/api' } } },
        }));
        api = require('@/lib/api').default;
      });

      // Must use EXPO_PUBLIC_API_URL, not the local IP injected by Constants
      expect(api.defaults.baseURL).toBe('https://pocketchange-backend.onrender.com/api');
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

  // ─── Timeout configuration ──────────────────────────────────────────────────

  describe('timeout configuration', () => {
    it('sets a 15000ms timeout on the Axios instance', () => {
      (global as any).__DEV__ = true;
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:4000/api';

      let api: any;
      jest.isolateModules(() => {
        api = require('@/lib/api').default;
      });

      expect(api.defaults.timeout).toBe(15000);
    });
  });

  // ─── Response interceptor — timeout errors ──────────────────────────────────

  describe('response interceptor — timeout errors', () => {
    function getResponseInterceptorRejected(apiInstance: any): (error: any) => Promise<any> {
      const handlers = (apiInstance.interceptors.response as any).handlers as Array<{
        fulfilled: (r: any) => any;
        rejected: (e: any) => any;
      } | null>;
      return handlers.filter(Boolean).at(-1)!.rejected;
    }

    beforeEach(() => {
      jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('rejects ECONNABORTED without showing an Alert', async () => {
      (global as any).__DEV__ = true;
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:4000/api';

      const { Alert } = require('react-native');
      (Alert.alert as jest.Mock).mockClear();

      let api: any;
      jest.isolateModules(() => {
        api = require('@/lib/api').default;
      });

      const rejected = getResponseInterceptorRejected(api);
      const timeoutError = { code: 'ECONNABORTED', config: { headers: {} } };

      await expect(rejected(timeoutError)).rejects.toMatchObject({ code: 'ECONNABORTED' });
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('rejects ERR_NETWORK without showing an Alert', async () => {
      (global as any).__DEV__ = true;
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:4000/api';

      const { Alert } = require('react-native');
      (Alert.alert as jest.Mock).mockClear();

      let api: any;
      jest.isolateModules(() => {
        api = require('@/lib/api').default;
      });

      const rejected = getResponseInterceptorRejected(api);
      const timeoutError = { code: 'ERR_NETWORK', config: { headers: {} } };

      await expect(rejected(timeoutError)).rejects.toMatchObject({ code: 'ERR_NETWORK' });
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('does NOT show a timeout Alert for non-timeout errors (no error.code)', async () => {
      (global as any).__DEV__ = true;
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:4000/api';

      const { Alert } = require('react-native');
      (Alert.alert as jest.Mock).mockClear();

      let api: any;
      jest.isolateModules(() => {
        api = require('@/lib/api').default;
      });

      const rejected = getResponseInterceptorRejected(api);
      const error = { response: { status: 500 }, config: { headers: {} } };

      await expect(rejected(error)).rejects.toMatchObject({ response: { status: 500 } });
      expect(Alert.alert).not.toHaveBeenCalledWith('Request timed out', expect.anything());
    });
  });

  // ─── Response interceptor — token refresh retry ─────────────────────────────

  describe('response interceptor — token refresh retry', () => {
    function getResponseInterceptorRejected(apiInstance: any): (error: any) => Promise<any> {
      const handlers = (apiInstance.interceptors.response as any).handlers as Array<{
        fulfilled: (r: any) => any;
        rejected: (e: any) => any;
      } | null>;
      return handlers.filter(Boolean).at(-1)!.rejected;
    }

    function make401Error() {
      return {
        response: { status: 401 },
        config: { headers: {} as Record<string, string> },
      };
    }

    let mockClearAuth: jest.Mock;
    let mockSetAuth: jest.Mock;

    beforeEach(() => {
      jest.useFakeTimers();
      jest.spyOn(console, 'warn').mockImplementation(() => {});
      jest.spyOn(console, 'error').mockImplementation(() => {});

      mockClearAuth = jest.fn();
      mockSetAuth = jest.fn();

      const { useAuthStore } = require('@/store/auth.store');
      useAuthStore.getState.mockReturnValue({
        accessToken: 'old-token',
        refreshToken: 'refresh-token',
        user: { id: '1', email: 'test@example.com' },
        setAuth: mockSetAuth,
        clearAuth: mockClearAuth,
      });
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    it('retries refresh once after a transient failure and does not call clearAuth', async () => {
      (global as any).__DEV__ = true;
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:4000/api';

      let api: any;
      let axiosMock: any;
      jest.isolateModules(() => {
        axiosMock = require('axios');
        (axiosMock.post as jest.Mock)
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce({ data: { accessToken: 'new-token-retry', refreshToken: 'new-refresh-retry' } });
        api = require('@/lib/api').default;
      });

      const rejected = getResponseInterceptorRejected(api);
      const p = rejected(make401Error());
      await jest.advanceTimersByTimeAsync(1100);
      await p.catch(() => {}); // api(original) will fail with network error — that's fine

      expect(mockClearAuth).not.toHaveBeenCalled();
      expect(mockSetAuth).toHaveBeenCalledWith(
        { id: '1', email: 'test@example.com' },
        'new-token-retry',
        'new-refresh-retry',
      );
    });

    it('calls clearAuth and console.error when both refresh attempts fail', async () => {
      (global as any).__DEV__ = true;
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:4000/api';

      let api: any;
      let axiosMock: any;
      jest.isolateModules(() => {
        axiosMock = require('axios');
        (axiosMock.post as jest.Mock).mockRejectedValue(new Error('Server down'));
        api = require('@/lib/api').default;
      });

      const rejected = getResponseInterceptorRejected(api);
      const p = rejected(make401Error());
      const safe = p.catch(() => {}); // attach handler immediately to prevent unhandled rejection
      await jest.advanceTimersByTimeAsync(1100);
      await safe;

      expect(mockClearAuth).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });

    it('calls router.replace to sign-in when both refresh attempts fail', async () => {
      (global as any).__DEV__ = true;
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:4000/api';

      const { router } = require('expo-router');

      let api: any;
      let axiosMock: any;
      jest.isolateModules(() => {
        axiosMock = require('axios');
        (axiosMock.post as jest.Mock).mockRejectedValue(new Error('Server down'));
        api = require('@/lib/api').default;
      });

      const rejected = getResponseInterceptorRejected(api);
      const p = rejected(make401Error());
      const safe = p.catch(() => {});
      await jest.advanceTimersByTimeAsync(1100);
      await safe;

      expect(router.replace).toHaveBeenCalledWith('/(auth)/sign-in');
    });

    it('calls queryClient.clear() when both refresh attempts fail', async () => {
      (global as any).__DEV__ = true;
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:4000/api';

      const { queryClient } = require('@/providers/QueryProvider');

      let api: any;
      let axiosMock: any;
      jest.isolateModules(() => {
        axiosMock = require('axios');
        (axiosMock.post as jest.Mock).mockRejectedValue(new Error('Server down'));
        api = require('@/lib/api').default;
      });

      const rejected = getResponseInterceptorRejected(api);
      const p = rejected(make401Error());
      const safe = p.catch(() => {});
      await jest.advanceTimersByTimeAsync(1100);
      await safe;

      expect(queryClient.clear).toHaveBeenCalled();
    });

    it('does not show an Alert when both refresh attempts fail', async () => {
      (global as any).__DEV__ = true;
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:4000/api';

      const { Alert } = require('react-native');
      (Alert.alert as jest.Mock).mockClear();

      let api: any;
      let axiosMock: any;
      jest.isolateModules(() => {
        axiosMock = require('axios');
        (axiosMock.post as jest.Mock).mockRejectedValue(new Error('Server down'));
        api = require('@/lib/api').default;
      });

      const rejected = getResponseInterceptorRejected(api);
      const p = rejected(make401Error());
      const safe = p.catch(() => {});
      await jest.advanceTimersByTimeAsync(1100);
      await safe;

      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('passes non-401 errors through without attempting refresh', async () => {
      (global as any).__DEV__ = true;
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:4000/api';

      let api: any;
      jest.isolateModules(() => {
        api = require('@/lib/api').default;
      });

      const rejected = getResponseInterceptorRejected(api);
      const error = { response: { status: 500 }, config: { headers: {} } };

      await expect(rejected(error)).rejects.toMatchObject({ response: { status: 500 } });
      expect(mockClearAuth).not.toHaveBeenCalled();
    });

    it('logs token refresh attempt to Sentry on first attempt', async () => {
      (global as any).__DEV__ = true;
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:4000/api';

      const Sentry = require('@sentry/react-native');
      (Sentry.addBreadcrumb as jest.Mock).mockClear();

      let api: any;
      let axiosMock: any;
      jest.isolateModules(() => {
        axiosMock = require('axios');
        (axiosMock.post as jest.Mock).mockResolvedValueOnce({ data: { accessToken: 'new-token', refreshToken: 'new-refresh' } });
        api = require('@/lib/api').default;
      });

      const rejected = getResponseInterceptorRejected(api);
      await rejected(make401Error());

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'auth',
          message: 'Token refresh attempt',
          level: 'info',
        })
      );
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'auth',
          message: 'Token refresh succeeded',
          level: 'info',
        })
      );
    });

    it('logs token refresh failure and retry to Sentry', async () => {
      (global as any).__DEV__ = true;
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:4000/api';

      const Sentry = require('@sentry/react-native');
      (Sentry.addBreadcrumb as jest.Mock).mockClear();

      let api: any;
      let axiosMock: any;
      jest.isolateModules(() => {
        axiosMock = require('axios');
        (axiosMock.post as jest.Mock)
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce({ data: { accessToken: 'new-token-retry', refreshToken: 'new-refresh-retry' } });
        api = require('@/lib/api').default;
      });

      const rejected = getResponseInterceptorRejected(api);
      const p = rejected(make401Error());
      await jest.advanceTimersByTimeAsync(1100);
      await p.catch(() => {});

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'auth',
          message: 'Token refresh failed, retrying',
          level: 'warning',
        })
      );
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'auth',
          message: 'Token refresh retry succeeded',
          level: 'info',
        })
      );
    });

    it('captures token refresh failure to Sentry when both attempts fail', async () => {
      (global as any).__DEV__ = true;
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:4000/api';

      const Sentry = require('@sentry/react-native');
      (Sentry.captureException as jest.Mock).mockClear();
      (Sentry.addBreadcrumb as jest.Mock).mockClear();

      let api: any;
      let axiosMock: any;
      jest.isolateModules(() => {
        axiosMock = require('axios');
        (axiosMock.post as jest.Mock).mockRejectedValue(new Error('Server down'));
        api = require('@/lib/api').default;
      });

      const rejected = getResponseInterceptorRejected(api);
      const p = rejected(make401Error());
      const safe = p.catch(() => {});
      await jest.advanceTimersByTimeAsync(1100);
      await safe;

      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          contexts: {
            auth: {
              action: 'tokenRefresh',
              status: 'failed_after_retry',
            },
          },
        })
      );
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'auth',
          message: 'Session expired dialog shown',
          level: 'warning',
        })
      );
    });
  });

  // ─── Response interceptor — null refreshToken bail-out (Bug 1) ──────────────

  describe('response interceptor — null refreshToken bail-out', () => {
    function getResponseInterceptorRejected(apiInstance: any): (error: any) => Promise<any> {
      const handlers = (apiInstance.interceptors.response as any).handlers as Array<{
        fulfilled: (r: any) => any;
        rejected: (e: any) => any;
      } | null>;
      return handlers.filter(Boolean).at(-1)!.rejected;
    }

    beforeEach(() => {
      jest.spyOn(console, 'warn').mockImplementation(() => {});
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const { useAuthStore } = require('@/store/auth.store');
      useAuthStore.getState.mockReturnValue({
        accessToken: null,
        refreshToken: null,
        user: null,
        setAuth: jest.fn(),
        clearAuth: jest.fn(),
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('does not call axios.post when refreshToken is null', async () => {
      (global as any).__DEV__ = true;
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:4000/api';

      let api: any;
      let axiosMock: any;
      jest.isolateModules(() => {
        axiosMock = require('axios');
        api = require('@/lib/api').default;
      });

      const rejected = getResponseInterceptorRejected(api);
      await rejected({ response: { status: 401 }, config: { headers: {} } }).catch(() => {});

      expect(axiosMock.post).not.toHaveBeenCalled();
    });

    it('calls clearAuth immediately when refreshToken is null', async () => {
      (global as any).__DEV__ = true;
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:4000/api';

      const mockClearAuth = jest.fn();
      const { useAuthStore } = require('@/store/auth.store');
      useAuthStore.getState.mockReturnValue({
        accessToken: null,
        refreshToken: null,
        user: null,
        setAuth: jest.fn(),
        clearAuth: mockClearAuth,
      });

      let api: any;
      jest.isolateModules(() => {
        api = require('@/lib/api').default;
      });

      const rejected = getResponseInterceptorRejected(api);
      await rejected({ response: { status: 401 }, config: { headers: {} } }).catch(() => {});

      expect(mockClearAuth).toHaveBeenCalled();
    });

    it('calls router.replace to sign-in immediately when refreshToken is null', async () => {
      (global as any).__DEV__ = true;
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:4000/api';

      const { router } = require('expo-router');

      let api: any;
      jest.isolateModules(() => {
        api = require('@/lib/api').default;
      });

      const rejected = getResponseInterceptorRejected(api);
      await rejected({ response: { status: 401 }, config: { headers: {} } }).catch(() => {});

      expect(router.replace).toHaveBeenCalledWith('/(auth)/sign-in');
    });

    it('calls router.replace exactly once when 3 concurrent null-token 401s arrive', async () => {
      (global as any).__DEV__ = true;
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:4000/api';

      const { router } = require('expo-router');
      (router.replace as jest.Mock).mockClear();

      let api: any;
      jest.isolateModules(() => {
        api = require('@/lib/api').default;
      });

      const rejected = getResponseInterceptorRejected(api);

      const p1 = rejected({ response: { status: 401 }, config: { headers: {} } }).catch(() => {});
      const p2 = rejected({ response: { status: 401 }, config: { headers: {} } }).catch(() => {});
      const p3 = rejected({ response: { status: 401 }, config: { headers: {} } }).catch(() => {});

      await Promise.all([p1, p2, p3]);

      expect(router.replace).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Response interceptor — concurrent 401s call logout exactly once (Bug 2) ─

  describe('response interceptor — concurrent 401s call logout exactly once', () => {
    function getResponseInterceptorRejected(apiInstance: any): (error: any) => Promise<any> {
      const handlers = (apiInstance.interceptors.response as any).handlers as Array<{
        fulfilled: (r: any) => any;
        rejected: (e: any) => any;
      } | null>;
      return handlers.filter(Boolean).at(-1)!.rejected;
    }

    beforeEach(() => {
      jest.useFakeTimers();
      jest.spyOn(console, 'warn').mockImplementation(() => {});
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const { useAuthStore } = require('@/store/auth.store');
      useAuthStore.getState.mockReturnValue({
        accessToken: 'old-token',
        refreshToken: 'refresh-token',
        user: { id: '1', email: 'test@example.com' },
        setAuth: jest.fn(),
        clearAuth: jest.fn(),
      });
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    it('calls router.replace exactly once when 3 concurrent 401s share a rejected pendingRefresh', async () => {
      (global as any).__DEV__ = true;
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:4000/api';

      const { router } = require('expo-router');
      (router.replace as jest.Mock).mockClear();

      let api: any;
      let axiosMock: any;
      jest.isolateModules(() => {
        axiosMock = require('axios');
        (axiosMock.post as jest.Mock).mockRejectedValue(new Error('Server down'));
        api = require('@/lib/api').default;
      });

      const rejected = getResponseInterceptorRejected(api);

      const p1 = rejected({ response: { status: 401 }, config: { headers: {} } }).catch(() => {});
      const p2 = rejected({ response: { status: 401 }, config: { headers: {} } }).catch(() => {});
      const p3 = rejected({ response: { status: 401 }, config: { headers: {} } }).catch(() => {});

      await jest.advanceTimersByTimeAsync(1100);
      await Promise.all([p1, p2, p3]);

      expect(router.replace).toHaveBeenCalledTimes(1);
      expect(router.replace).toHaveBeenCalledWith('/(auth)/sign-in');
    });

    it('calls clearAuth exactly once when 3 concurrent 401s share a rejected pendingRefresh', async () => {
      (global as any).__DEV__ = true;
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:4000/api';

      const mockClearAuth = jest.fn();
      const { useAuthStore } = require('@/store/auth.store');
      useAuthStore.getState.mockReturnValue({
        accessToken: 'old-token',
        refreshToken: 'refresh-token',
        user: { id: '1', email: 'test@example.com' },
        setAuth: jest.fn(),
        clearAuth: mockClearAuth,
      });

      let api: any;
      let axiosMock: any;
      jest.isolateModules(() => {
        axiosMock = require('axios');
        (axiosMock.post as jest.Mock).mockRejectedValue(new Error('Server down'));
        api = require('@/lib/api').default;
      });

      const rejected = getResponseInterceptorRejected(api);

      const p1 = rejected({ response: { status: 401 }, config: { headers: {} } }).catch(() => {});
      const p2 = rejected({ response: { status: 401 }, config: { headers: {} } }).catch(() => {});
      const p3 = rejected({ response: { status: 401 }, config: { headers: {} } }).catch(() => {});

      await jest.advanceTimersByTimeAsync(1100);
      await Promise.all([p1, p2, p3]);

      expect(mockClearAuth).toHaveBeenCalledTimes(1);
    });
  });
});
