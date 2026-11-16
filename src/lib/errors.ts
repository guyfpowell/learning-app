import { AxiosError } from 'axios';
import { NO_SIGNAL_ERROR } from '@learning/shared';
import { withoutEmDashes } from '@/lib/emDash';
import { errorCode, responseData, stringField } from '@/lib/errorCode';
import { isSignalDrop } from '@/lib/offlineWrites';

export { errorCode };

export const TIMEOUT_ERROR = 'Request timed out. Please try again.';
export const NETWORK_ERROR = 'Network error. Please check your connection.';
/** Shown when the server gave no message of its own, so a raw `Error.message` never reaches the screen. */
export const GENERIC_ERROR = 'Something went wrong. Please try again.';

export function extractError(err: unknown): string {
  const transportCode = stringField(err, 'code');
  if (transportCode === AxiosError.ECONNABORTED) return TIMEOUT_ERROR;
  if (transportCode === AxiosError.ERR_NETWORK) return NETWORK_ERROR;
  const data = responseData(err);
  return withoutEmDashes(stringField(data, 'message') || stringField(data, 'error') || GENERIC_ERROR);
}

/**
 * The message for a write that isn't safe to send again (ADR-021 Decision 6). A write that found
 * no signal, or lost it before the server answered, says it was the signal; anything the server
 * answered (a 4xx or 5xx) shows what it shows today: `fallback` where the screen has fixed copy,
 * otherwise the server's message.
 */
export function writeError(err: unknown, fallback?: string): string {
  if (isSignalDrop(err)) return NO_SIGNAL_ERROR;
  return fallback ?? extractError(err);
}
