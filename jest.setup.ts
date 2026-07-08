// ─── Global module mocks ──────────────────────────────────────────────────────
// @sentry/react-native ships TypeScript source (not CJS) so Jest can't parse it
// without running it through the transformer; mocking it globally avoids the
// transformIgnorePatterns complexity that varies between jest-expo versions.
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
  setExtra: jest.fn(),
  withScope: jest.fn((_cb: (scope: unknown) => void) => {}),
  Severity: { Error: 'error', Warning: 'warning', Info: 'info' },
  ReactNavigationInstrumentation: jest.fn(),
  wrap: (Component: unknown) => Component,
}));

// ─── atob polyfill (used by auth.service JWT decoder) ────────────────────────
if (typeof global.atob === 'undefined') {
  global.atob = (b64: string) => Buffer.from(b64, 'base64').toString('binary');
}

// ─── Silence known noisy warnings in test output ──────────────────────────────
const originalWarn = console.warn.bind(console);
beforeAll(() => {
  console.warn = (msg: string, ...args: unknown[]) => {
    if (
      typeof msg === 'string' &&
      (msg.includes('ReactCurrentDispatcher') ||
        msg.includes('act(') ||
        msg.includes('Warning: An update to'))
    ) {
      return;
    }
    originalWarn(msg, ...args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
  jest.clearAllTimers();
});
