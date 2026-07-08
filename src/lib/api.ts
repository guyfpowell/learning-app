import axios from 'axios';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import { queryClient } from '@/providers/QueryProvider';
import * as Sentry from '@sentry/react-native';

const BASE_URL: string =
  process.env.EXPO_PUBLIC_API_URL ??
  'http://localhost:3000/api';

// Throw at module load in production if URL is explicitly localhost — surfaces
// build configuration errors immediately rather than during user interactions.
if (!__DEV__ && (!BASE_URL || BASE_URL === 'http://localhost:3000/api')) {
  throw new Error(
    '[api] EXPO_PUBLIC_API_URL is not set or is localhost. ' +
    'This is a build configuration error. ' +
    `Current value: ${BASE_URL}`
  );
}

// withCredentials lets the native HTTP stack store and resend the httpOnly
// refresh_token cookie the API sets on login/register/refresh (same cookie-based
// refresh flow as the web client — see AuthController.setRefreshTokenCookie).
const api = axios.create({ baseURL: BASE_URL, timeout: 15000, withCredentials: true });

// ─── Request: security check + inject Bearer token ───────────────────────────
api.interceptors.request.use((config) => {
  if (!__DEV__ && !BASE_URL.startsWith('https://')) {
    console.warn(`[api] Insecure API URL in production: ${BASE_URL}`);
    return Promise.reject(new Error(`[api] Insecure API URL in production: ${BASE_URL}`));
  }

  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ─── Response: on 401 → try refresh, then sign out if refresh fails ──────────
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

async function tryRefresh(): Promise<string | null> {
  try {
    // No body — the refresh token travels only as the httpOnly cookie.
    const res = await api.post('/auth/refresh', undefined, {
      // Skip the interceptor for this request
      headers: { 'X-Skip-Refresh': 'true' },
    });
    const { token: newToken } = res.data;
    const { user } = useAuthStore.getState();
    if (user) useAuthStore.getState().setAuth(user, newToken);
    return newToken;
  } catch {
    return null;
  }
}

function signOutAndRedirect() {
  Sentry.addBreadcrumb({
    category: 'auth',
    message: 'Session expired — signing out',
    level: 'warning',
  });
  useAuthStore.getState().clearAuth();
  queryClient.clear();
  router.replace('/(auth)/sign-in');
}

api.interceptors.response.use(
  (response) => {
    // Backend wraps every success response as { success, data, timestamp }.
    // Unwrap here so services can treat response.data as the model directly.
    if (response.data && typeof response.data === 'object' && 'success' in response.data && 'data' in response.data) {
      response.data = response.data.data;
    }
    return response;
  },
  async (error) => {
    if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
      return Promise.reject(error);
    }

    // Auth endpoint 401s (wrong credentials) and refresh requests pass directly to caller.
    const url = error.config?.url ?? '';
    if (error.response?.status === 401 && (url.startsWith('/auth/') || error.config?.headers?.['X-Skip-Refresh'])) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push((newToken: string) => {
            error.config.headers['Authorization'] = `Bearer ${newToken}`;
            api.request(error.config).then(resolve).catch(reject);
          });
        });
      }

      isRefreshing = true;
      const newToken = await tryRefresh();
      isRefreshing = false;

      if (newToken) {
        refreshQueue.forEach(cb => cb(newToken));
        refreshQueue = [];
        error.config.headers['Authorization'] = `Bearer ${newToken}`;
        return api.request(error.config);
      }

      refreshQueue = [];
      signOutAndRedirect();
    }

    return Promise.reject(error);
  }
);

export async function registerPushToken(
  token: string,
  platform: 'expo' | 'web',
  deviceId?: string
): Promise<void> {
  await api.post('/notifications/push-token', { token, platform, deviceId });
}

export default api;
