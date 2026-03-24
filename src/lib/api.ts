import axios from 'axios';
import { useAuthStore } from '@/store/auth.store';

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

const api = axios.create({ baseURL: BASE_URL });

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
let pendingRefresh: Promise<string> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as typeof error.config & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      try {
        const { refreshToken, user, setAuth } = useAuthStore.getState();

        if (!pendingRefresh) {
          pendingRefresh = axios
            .post<{ accessToken: string }>(`${BASE_URL}/auth/refresh`, { refreshToken })
            .then((res) => res.data.accessToken)
            .finally(() => {
              pendingRefresh = null;
            });
        }

        const newAccessToken = await pendingRefresh;

        if (user) {
          setAuth(user, newAccessToken, refreshToken ?? '');
        }

        original.headers = {
          ...original.headers,
          Authorization: `Bearer ${newAccessToken}`,
        };

        return api(original);
      } catch {
        useAuthStore.getState().clearAuth();
        // Root layout reacts to cleared auth state and redirects to sign-in
      }
    }

    return Promise.reject(error);
  }
);

export default api;
