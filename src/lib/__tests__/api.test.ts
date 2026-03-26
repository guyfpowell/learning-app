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

    it('shows a "Request timed out" Alert for ECONNABORTED errors', async () => {
      (global as any).__DEV__ = true;
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:4000/api';

      const { Alert } = require('react-native');

      let api: any;
      jest.isolateModules(() => {
        api = require('@/lib/api').default;
      });

      const rejected = getResponseInterceptorRejected(api);
      const timeoutError = { code: 'ECONNABORTED', config: { headers: {} } };

      await expect(rejected(timeoutError)).rejects.toMatchObject({ code: 'ECONNABORTED' });
      expect(Alert.alert).toHaveBeenCalledWith(
        'Request timed out',
        expect.stringContaining('try again'),
      );
    });

    it('shows a "Request timed out" Alert for ERR_NETWORK errors', async () => {
      (global as any).__DEV__ = true;
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:4000/api';

      const { Alert } = require('react-native');

      let api: any;
      jest.isolateModules(() => {
        api = require('@/lib/api').default;
      });

      const rejected = getResponseInterceptorRejected(api);
      const timeoutError = { code: 'ERR_NETWORK', config: { headers: {} } };

      await expect(rejected(timeoutError)).rejects.toMatchObject({ code: 'ERR_NETWORK' });
      expect(Alert.alert).toHaveBeenCalledWith(
        'Request timed out',
        expect.stringContaining('try again'),
      );
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
          .mockResolvedValueOnce({ data: { accessToken: 'new-token-retry' } });
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
        'refresh-token',
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

    it('shows an Alert when both refresh attempts fail', async () => {
      (global as any).__DEV__ = true;
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:4000/api';

      const { Alert } = require('react-native');

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

      expect(Alert.alert).toHaveBeenCalledWith(
        'Session expired',
        expect.stringContaining('log in'),
      );
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
        (axiosMock.post as jest.Mock).mockResolvedValueOnce({ data: { accessToken: 'new-token' } });
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
          .mockResolvedValueOnce({ data: { accessToken: 'new-token-retry' } });
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
});
