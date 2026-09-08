export function extractError(err: unknown): string {
  const typed = err as { code?: string; response?: { data?: { error?: string; message?: string } } };

  if (typed?.code === 'ECONNABORTED') {
    return 'Request timed out. Please try again.';
  }
  if (typed?.code === 'ERR_NETWORK') {
    return 'Network error. Please check your connection.';
  }
  if (typed?.response?.data?.message) {
    return typed.response.data.message;
  }
  if (typed?.response?.data?.error) {
    return typed.response.data.error;
  }

  return 'Something went wrong. Please try again.';
}

/**
 * The server's own error code, when there is one — 068 Chunk 9f.
 *
 * `extractError` returns the message a person reads; this says what kind of
 * thing it was, so a refusal can be rendered as a notice rather than in the red
 * error style. The person asking for a track did nothing broken.
 */
export function errorCode(err: unknown): string | null {
  const typed = err as { response?: { data?: { code?: unknown } } };
  const code = typed?.response?.data?.code;
  return typeof code === 'string' ? code : null;
}
