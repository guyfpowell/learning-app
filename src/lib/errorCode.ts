type BodyField = 'code' | 'message' | 'error';

/** The body of a failed request's response, when the error carries one. */
export function responseData(err: unknown): unknown {
  if (typeof err !== 'object' || err === null || !('response' in err)) return undefined;
  const { response } = err;
  if (typeof response !== 'object' || response === null || !('data' in response)) return undefined;
  return response.data;
}

/** A string field of `value`, or null when it is missing or not a string. */
export function stringField(value: unknown, key: BodyField): string | null {
  if (typeof value !== 'object' || value === null) return null;
  const field: unknown = Reflect.get(value, key);
  return typeof field === 'string' ? field : null;
}

/**
 * The server's own error code, when there is one — 068 Chunk 9f.
 *
 * `extractError` returns the message a person reads; this says what kind of
 * thing it was, so a refusal can be rendered as a notice rather than in the red
 * error style. The person asking for a track did nothing broken. Its own module,
 * so the retry rule (`offlineWrites.ts`) can read a code without importing the copy.
 */
export function errorCode(err: unknown): string | null {
  return stringField(responseData(err), 'code');
}
