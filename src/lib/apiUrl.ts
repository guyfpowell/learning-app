import Constants from 'expo-constants';

// Dev fallback: the API runs on the same machine as Metro, so take the host the
// phone already used to reach Metro (`hostUri`, e.g. "192.168.1.130:8081"). It is
// always current — no IP is ever written into a file. On the simulator hostUri is
// localhost, so it behaves exactly as before. Production never uses this: it must
// set EXPO_PUBLIC_API_URL (checked below).
function devApiUrl(): string {
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host || 'localhost'}:3000/api`;
}

/** The one base URL every request uses (`api.ts`). */
export const API_BASE_URL: string = process.env.EXPO_PUBLIC_API_URL ?? devApiUrl();

// Throw at module load in production if URL is explicitly localhost — surfaces
// build configuration errors immediately rather than during user interactions.
if (!__DEV__ && (!API_BASE_URL || API_BASE_URL === 'http://localhost:3000/api')) {
  throw new Error(
    '[api] EXPO_PUBLIC_API_URL is not set or is localhost. ' +
    'This is a build configuration error. ' +
    `Current value: ${API_BASE_URL}`
  );
}

/** The API's origin: the base URL without its `/api` path. */
export const API_ORIGIN: string = API_BASE_URL.replace(/\/api\/?$/, '');

/**
 * The unauthenticated liveness route, at the API's origin. NetInfo's reachability check calls it,
 * so "reachable" means Ascent's server answers (ADR-021 Decision 3).
 */
export const HEALTH_URL = `${API_ORIGIN}/health`;
