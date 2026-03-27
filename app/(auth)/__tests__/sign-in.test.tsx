import { extractError } from '../sign-in';

describe('sign-in screen — extractError', () => {
  it('returns timeout message for ECONNABORTED', () => {
    expect(extractError({ code: 'ECONNABORTED' })).toBe('Request timed out. Please try again.');
  });

  it('returns network message for ERR_NETWORK', () => {
    expect(extractError({ code: 'ERR_NETWORK' })).toBe('Network error. Please check your connection.');
  });

  it('returns server error message from response body', () => {
    expect(extractError({ response: { data: { error: 'Invalid credentials' } } })).toBe('Invalid credentials');
  });

  it('falls back to generic message when no specific error', () => {
    expect(extractError({ response: { data: {} } })).toBe('Invalid email or password. Please try again.');
  });

  it('falls back to generic message for unknown error shape', () => {
    expect(extractError({})).toBe('Invalid email or password. Please try again.');
  });
});
