type BodyField = 'code' | 'message' | 'error';

/** The body of a failed request's response, when the error carries one. */
function responseData(err: unknown): unknown {
  if (typeof err !== 'object' || err === null || !('response' in err)) return undefined;
  const { response } = err;
  if (typeof response !== 'object' || response === null || !('data' in response)) return undefined;
  return response.data;
}

/** A string field of `value`, or null when it is missing or not a string. */
function stringField(value: unknown, key: BodyField): string | null {
  if (typeof value !== 'object' || value === null) return null;
  const field: unknown = Reflect.get(value, key);
  return typeof field === 'string' ? field : null;
}

export function extractError(err: unknown): string {
  const transportCode = stringField(err, 'code');
  if (transportCode === 'ECONNABORTED') return 'Request timed out. Please try again.';
  if (transportCode === 'ERR_NETWORK') return 'Network error. Please check your connection.';
  const data = responseData(err);
  return stringField(data, 'message') || stringField(data, 'error') || 'Something went wrong. Please try again.';
}

/**
 * The server's own error code, when there is one — 068 Chunk 9f.
 *
 * `extractError` returns the message a person reads; this says what kind of
 * thing it was, so a refusal can be rendered as a notice rather than in the red
 * error style. The person asking for a track did nothing broken.
 */
export function errorCode(err: unknown): string | null {
  return stringField(responseData(err), 'code');
}
