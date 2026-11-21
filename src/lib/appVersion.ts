import Constants from 'expo-constants';

/**
 * The version of the code that's running, for `X-App-Version` (ADR-023 Decision 1), or null when the
 * config has none (the server then counts it as the oldest version).
 *
 * `Constants.expoConfig` is the config of the running bundle: for an OTA update it is the update's own
 * manifest (`extra.expoClient`, `expo-constants/src/Constants.ts` lines 159-160), and only an embedded
 * launch reads the config baked into the binary (lines 155-157).
 */
export function appVersionOf(): string | null {
  return Constants.expoConfig?.version ?? null;
}
