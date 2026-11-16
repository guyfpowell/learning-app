import { uuid } from 'expo-modules-core';
import type { AxiosRequestConfig } from 'axios';
import { IDEMPOTENCY_KEY_HEADER } from '@learning/shared';

/**
 * The key a write that is safe to send again carries (ADR-021 Decision 5). Made when the person
 * taps, never in the request function, which runs again on every retry: a retry and a write
 * restored after a restart send the same key, and the server replays the first result.
 */
export function newIdempotencyKey(): string {
  return uuid.v4();
}

/** The request config that carries the key. */
export function withIdempotencyKey(key: string): AxiosRequestConfig {
  return { headers: { [IDEMPOTENCY_KEY_HEADER]: key } };
}
