import axios from 'axios';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import { queryClient } from '@/providers/QueryProvider';
import * as Sentry from '@sentry/react-native';

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://pocketchange-backend.onrender.com/api';

// Throw at module load in production if URL is explicitly localhost — surfaces
// build configuration errors immediately rather than during user interactions.
if (!__DEV__ && (!BASE_URL || BASE_URL === 'http://localhost:4000/api')) {
  throw new Error(
    '[api] EXPO_PUBLIC_API_URL is not set or is localhost. ' +
    'This is a build configuration error. ' +
    'Contact DevOps immediately. ' +
    `Current value: ${BASE_URL}`
  );
}

const api = axios.create({ baseURL: BASE_URL, timeout: 15000 });

// ─── Request: security check + inject Bearer token ───────────────────────────
api.interceptors.request.use((config) => {
  // Reject insecure requests in production — development builds may use localhost
  if (!__DEV__ && !BASE_URL.startsWith('https://')) {
    console.warn(`[api] Insecure API URL in production: ${BASE_URL}`);
    return Promise.reject(
      new Error(`[api] Insecure API URL in production: ${BASE_URL}`)
    );
  }

  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ─── Response: on 401 → refresh once → retry → clear session ─────────────────
// Mutex: concurrent 401s share a single refresh promise to avoid multiple refresh calls
type RefreshResult = { accessToken: string; refreshToken?: string };
let pendingRefresh: Promise<RefreshResult> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as typeof error.config & { _retry?: boolean };

    if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      try {
        const { refreshToken } = useAuthStore.getState();

        if (!pendingRefresh) {
          pendingRefresh = (async (): Promise<RefreshResult> => {
            try {
              Sentry.addBreadcrumb({
                category: 'auth',
                message: 'Token refresh attempt',
                level: 'info',
              });

              const res = await axios.post<RefreshResult>(
                `${BASE_URL}/auth/refresh`,
                { refreshToken },
              );

              Sentry.addBreadcrumb({
                category: 'auth',
                message: 'Token refresh succeeded',
                level: 'info',
              });

              return res.data;
            } catch (firstErr) {
              console.warn('[api] Token refresh failed, retrying in 1s...', firstErr);

              Sentry.addBreadcrumb({
                category: 'auth',
                message: 'Token refresh failed, retrying',
                level: 'warning',
                data: {
                  error: String(firstErr),
                },
              });

              await new Promise<void>((resolve) => setTimeout(resolve, 1000));
              const { refreshToken: rt } = useAuthStore.getState();
              const res = await axios.post<RefreshResult>(
                `${BASE_URL}/auth/refresh`,
                { refreshToken: rt },
              );

              Sentry.addBreadcrumb({
                category: 'auth',
                message: 'Token refresh retry succeeded',
                level: 'info',
              });

              return res.data;
            }
          })().finally(() => {
            pendingRefresh = null;
          });
        }

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await pendingRefresh;

        const { user, setAuth, refreshToken: storedRefreshToken } = useAuthStore.getState();
        if (user) {
          setAuth(user, newAccessToken, newRefreshToken ?? storedRefreshToken ?? '');
        }

        original.headers = {
          ...original.headers,
          Authorization: `Bearer ${newAccessToken}`,
        };

        return api(original);
      } catch (err) {
        console.error('[api] Token refresh failed after retry — logging out:', err);

        Sentry.captureException(err, {
          contexts: {
            auth: {
              action: 'tokenRefresh',
              status: 'failed_after_retry',
            },
          },
        });

        Sentry.addBreadcrumb({
          category: 'auth',
          message: 'Session expired dialog shown',
          level: 'warning',
          data: {
            error: String(err),
          },
        });

        useAuthStore.getState().clearAuth();
        queryClient.clear();
        router.replace('/(auth)/sign-in');
      }
    }

    return Promise.reject(error);
  }
);

export default api;
