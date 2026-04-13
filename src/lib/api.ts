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

const api = axios.create({ baseURL: BASE_URL, timeout: 15000 });

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

// ─── Response: on 401 → clear session and redirect ───────────────────────────
// The learning backend uses stateless JWTs with no refresh token endpoint.
// A 401 means the token has expired or is invalid — clear auth and sign out.
let logoutHandled = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
      return Promise.reject(error);
    }

    // Auth endpoint 401s (wrong credentials) pass directly to the caller.
    if (error.response?.status === 401 && (error.config?.url ?? '').startsWith('/auth/')) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      if (!logoutHandled) {
        logoutHandled = true;

        Sentry.addBreadcrumb({
          category: 'auth',
          message: 'Session expired — signing out',
          level: 'warning',
        });

        useAuthStore.getState().clearAuth();
        queryClient.clear();
        router.replace('/(auth)/sign-in');

        // Reset guard after tick so future requests aren't blocked
        setTimeout(() => { logoutHandled = false; }, 0);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
