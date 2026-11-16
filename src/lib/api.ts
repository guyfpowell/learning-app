import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import { CLIENT_HEADER, CLIENT_MOBILE, DEVICE_HEADER, DEVICE_PHONE, DEVICE_TABLET, type AuthResponse } from '@learning/shared';
import { API_BASE_URL } from '@/lib/apiUrl';
import { BACKGROUND_HEADER, SKIP_REFRESH_HEADER } from '@/lib/requestHeaders';
import { useAuthStore } from '@/store/auth.store';
import { queryClient } from '@/lib/queryClient';
import { clearSessionData } from '@/lib/offlineWrites';
import * as Sentry from '@sentry/react-native';

/** A request that hasn't answered by then fails as a timeout. */
const REQUEST_TIMEOUT_MS = 15_000;

// Read once: a phone doesn't become a tablet while the app runs. An unknown type counts as a
// phone. The server keeps one session for each kind of device (`docs/architecture/auth.md`).
const DEVICE_KIND = Device.deviceType === Device.DeviceType.TABLET ? DEVICE_TABLET : DEVICE_PHONE;

// withCredentials lets the native HTTP stack store and resend the httpOnly
// refresh_token cookie the API sets on login/register/refresh (same cookie-based
// refresh flow as the web client — see AuthController.setRefreshTokenCookie).
const api = axios.create({ baseURL: API_BASE_URL, timeout: REQUEST_TIMEOUT_MS, withCredentials: true });

// ─── Request: security check + inject Bearer token ───────────────────────────
api.interceptors.request.use((config) => {
  if (!__DEV__ && !API_BASE_URL.startsWith('https://')) {
    console.warn(`[api] Insecure API URL in production: ${API_BASE_URL}`);
    return Promise.reject(new Error(`[api] Insecure API URL in production: ${API_BASE_URL}`));
  }

  // See the same header on web: which surface, stated not inferred, and which kind of device.
  config.headers[CLIENT_HEADER] = CLIENT_MOBILE;
  config.headers[DEVICE_HEADER] = DEVICE_KIND;

  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = bearer(accessToken);
  }
  return config;
});

function bearer(token: string): string {
  return `Bearer ${token}`;
}

// ─── Response: on 401 → refresh, then sign out only if the server refuses it ──

/** One refresh at a time: every 401 that arrives while it runs waits on the same one. */
interface Refresh {
  /** The new access token, or null when the server refused (`tryRefresh`). */
  token: Promise<string | null>;
  /** Set once a foreground call has signed out after this refresh was refused. */
  signedOut: boolean;
}

let currentRefresh: Refresh | null = null;

function sharedRefresh(): Refresh {
  if (currentRefresh) return currentRefresh;
  const started: Refresh = {
    token: tryRefresh().finally(() => { currentRefresh = null; }),
    signedOut: false,
  };
  currentRefresh = started;
  return started;
}

/** Only these answers from `/auth/refresh` mean the session is over. */
const REFRESH_REFUSAL_STATUSES: readonly number[] = [401, 403];

function isRefreshRefusal(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response !== undefined && REFRESH_REFUSAL_STATUSES.includes(err.response.status);
}

/**
 * The new access token, or null when the server refused the refresh (the session is over).
 * Any other failure (network error, timeout, 5xx, a 429 or another 4xx) throws that error
 * instead, so the caller can fail without signing anyone out (ADR-021, Decision 1).
 */
async function tryRefresh(): Promise<string | null> {
  try {
    // No body — the refresh token travels only as the httpOnly cookie.
    const res = await api.post<Pick<AuthResponse, 'token'>>('/auth/refresh', undefined, { headers: { [SKIP_REFRESH_HEADER]: 'true' } });
    const newToken = res.data.token;
    const { user, setAuth } = useAuthStore.getState();
    if (user) setAuth(user, newToken);
    return newToken;
  } catch (err) {
    Sentry.addBreadcrumb({
      category: 'auth',
      message: 'Token refresh failed',
      level: 'warning',
      data: { err: String(err) },
    });
    if (isRefreshRefusal(err)) return null;
    throw err;
  }
}

function signOutAndRedirect() {
  Sentry.addBreadcrumb({
    category: 'auth',
    message: 'Session expired, signing out',
    level: 'warning',
  });
  useAuthStore.getState().clearAuth();
  void clearSessionData(queryClient);
  router.replace('/(auth)/sign-in');
}

/** A 401 a new access token could fix: not a wrong password on an auth route, and not the refresh call itself. */
function needsRefresh(error: AxiosError, config: InternalAxiosRequestConfig): boolean {
  if (error.response?.status !== 401) return false;
  return !(config.url ?? '').startsWith('/auth/') && !config.headers[SKIP_REFRESH_HEADER];
}

/**
 * Waits on the shared refresh and sends the call again with the new token. A refresh that failed
 * without a refusal rejects here with its error, and nobody signs out. After a refusal each call
 * rejects with its own 401, and the first foreground call signs out; a background call never does.
 */
async function refreshAndResend(error: AxiosError, config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  const refresh = sharedRefresh();
  const token = await refresh.token;
  if (token) {
    config.headers.Authorization = bearer(token);
    return api.request(config);
  }
  if (!refresh.signedOut && !config.headers[BACKGROUND_HEADER]) {
    refresh.signedOut = true;
    signOutAndRedirect();
  }
  throw error;
}

api.interceptors.response.use(
  (response) => {
    // Backend wraps every success response as { success, data, timestamp }.
    // Unwrap so services can treat response.data as the model directly.
    //
    // Always the same shape. The old carve-out that preserved sibling top-level keys
    // existed solely for `customPlans` on GET /enrollments (ticket 071); ADR-009 folded
    // custom paths into `data`, so nothing sends siblings any more. Removed rather than
    // left in place: a response shape that varied by endpoint is what forced every
    // caller to normalise before it could read its own data.
    if (response.data && typeof response.data === 'object' && 'success' in response.data && 'data' in response.data) {
      response.data = response.data.data;
    }
    return response;
  },
  (error: unknown) => {
    if (!axios.isAxiosError(error) || error.config === undefined || !needsRefresh(error, error.config)) {
      return Promise.reject(error);
    }
    return refreshAndResend(error, error.config);
  }
);

export default api;
