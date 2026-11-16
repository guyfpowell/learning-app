import { axiosError } from '@/test-utils/axios';
import { NO_SIGNAL_ERROR } from '@learning/shared';
import { NoSignalError } from '@/lib/offlineWrites';
import { GENERIC_ERROR, NETWORK_ERROR, TIMEOUT_ERROR, errorCode, extractError, writeError } from '../errors';

const failed = (data: unknown) => ({ response: { data } });


// 105g: one message when it was the signal; otherwise what the action shows today.
describe('writeError', () => {
  it.each([
    ['no signal to begin with', new NoSignalError()],
    ['a network error in flight', axiosError('ERR_NETWORK')],
    ['a timeout in flight', axiosError('ECONNABORTED')],
  ])('says it was the signal for %s', (_name, err) => {
    expect(writeError(err)).toBe(NO_SIGNAL_ERROR);
    expect(writeError(err, 'Fixed copy')).toBe(NO_SIGNAL_ERROR);
  });

  it("shows the server's message for a 4xx, as today", () => {
    expect(writeError(axiosError('ERR_BAD_REQUEST', 409, { message: 'Already enrolled' }))).toBe('Already enrolled');
  });

  it('shows the fixed copy for a 5xx where the screen has fixed copy, as today', () => {
    expect(writeError(axiosError('ERR_BAD_RESPONSE', 503), GENERIC_ERROR)).toBe(GENERIC_ERROR);
  });
});

describe('extractError', () => {
  it('shows no em dash in the server\'s message, wherever the message is shown', () => {
    const err = { response: { data: { message: "That name isn't allowed — pick another." } } };
    expect(extractError(err)).toBe("That name isn't allowed. Pick another.");
  });

  it('says a timed-out request timed out', () => {
    expect(extractError({ code: 'ECONNABORTED' })).toBe(TIMEOUT_ERROR);
  });

  it('says a network failure is a network failure', () => {
    expect(extractError({ code: 'ERR_NETWORK' })).toBe(NETWORK_ERROR);
  });

  it("shows the server's message, then its error, before the fallback", () => {
    expect(extractError(failed({ message: 'Boom', error: 'Bad' }))).toBe('Boom');
    expect(extractError(failed({ error: 'Bad' }))).toBe('Bad');
  });

  it('falls back for anything else, never a raw Error message', () => {
    expect(extractError(new Error('http://internal/stack'))).toBe(GENERIC_ERROR);
    expect(extractError(failed({ message: 42 }))).toBe(GENERIC_ERROR);
    expect(extractError(null)).toBe(GENERIC_ERROR);
    expect(extractError({})).toBe(GENERIC_ERROR);
    expect(extractError(failed({}))).toBe(GENERIC_ERROR);
    expect(extractError(failed('<html>503 Service Unavailable</html>'))).toBe(GENERIC_ERROR);
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
