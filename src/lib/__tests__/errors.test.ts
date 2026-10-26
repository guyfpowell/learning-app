import { errorCode, extractError } from '../errors';

const failed = (data: unknown) => ({ response: { data } });

describe('extractError', () => {
  it('says a timed-out request timed out', () => {
    expect(extractError({ code: 'ECONNABORTED' })).toBe('Request timed out. Please try again.');
  });

  it('says a network failure is a network failure', () => {
    expect(extractError({ code: 'ERR_NETWORK' })).toBe('Network error. Please check your connection.');
  });

  it("shows the server's message, then its error, before the fallback", () => {
    expect(extractError(failed({ message: 'Boom', error: 'Bad' }))).toBe('Boom');
    expect(extractError(failed({ error: 'Bad' }))).toBe('Bad');
  });

  it('falls back for anything else, never a raw Error message', () => {
    expect(extractError(new Error('http://internal/stack'))).toBe('Something went wrong. Please try again.');
    expect(extractError(failed({ message: 42 }))).toBe('Something went wrong. Please try again.');
    expect(extractError(null)).toBe('Something went wrong. Please try again.');
  });
});

describe('errorCode', () => {
  it("reads the server's code", () => {
    expect(errorCode(failed({ code: 'PLAN_LIMIT' }))).toBe('PLAN_LIMIT');
  });

  it('is null with no response body, or a code that is not a string', () => {
    expect(errorCode(new Error('x'))).toBeNull();
    expect(errorCode(failed(null))).toBeNull();
    expect(errorCode(failed({ code: 7 }))).toBeNull();
    expect(errorCode(undefined)).toBeNull();
  });
});
