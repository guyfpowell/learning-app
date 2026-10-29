import React, { act } from 'react';
import { render } from '@testing-library/react-native';

const mockReplace = jest.fn();
let mockSegments: string[] = [];
let mockAuthState = {
  _hasHydrated: false,
  accessToken: null as string | null,
};

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('expo-router', () => ({
  Stack: Object.assign(
    ({ children }: { children?: React.ReactNode }) => children ?? null,
    { Screen: () => null }
  ),
  useSegments: () => mockSegments,
  usePathname: () => (mockSegments.length === 0 ? '/' : '/' + mockSegments.join('/')),
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('@/store/auth.store', () => ({
  useAuthStore: jest.fn((selector?: (s: typeof mockAuthState) => unknown) =>
    selector ? selector(mockAuthState) : mockAuthState
  ),
}));

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  wrap: jest.fn((c: unknown) => c),
}));

jest.mock('@expo-google-fonts/poppins', () => ({
  Poppins_400Regular: undefined,
  Poppins_500Medium: undefined,
  Poppins_700Bold: undefined,
  useFonts: jest.fn(() => [true, null]),
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
  hideAsync: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: { children?: React.ReactNode }) => children,
}));

jest.mock('@/providers/QueryProvider', () => ({
  QueryProvider: ({ children }: { children?: React.ReactNode }) => children,
}));

jest.mock('@/theme', () => ({
  colors: { bg: '#F8FAFC' },
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AuthGate', () => {
  let AuthGate: React.FC;

  beforeAll(() => {
    AuthGate = require('../_layout').AuthGate;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSegments = [];
    mockAuthState = { _hasHydrated: false, accessToken: null };
  });

  it('does nothing before hydration', () => {
    mockAuthState._hasHydrated = false;
    render(<AuthGate />);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('navigates to sign-in when unauthenticated and at root', () => {
    mockAuthState._hasHydrated = true;
    mockAuthState.accessToken = null;
    mockSegments = [];
    render(<AuthGate />);
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/sign-in');
  });

  it('does not navigate when already on auth screen (no loop)', () => {
    mockAuthState._hasHydrated = true;
    mockAuthState.accessToken = null;
    mockSegments = ['(auth)', 'sign-in'];
    render(<AuthGate />);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('navigates to /(tabs)/lessons when authenticated and at root', () => {
    mockAuthState._hasHydrated = true;
    mockAuthState.accessToken = 'tok';
    mockSegments = [];
    render(<AuthGate />);
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/lessons');
  });

  it('navigates to /(tabs)/lessons when authenticated and on auth screen', () => {
    mockAuthState._hasHydrated = true;
    mockAuthState.accessToken = 'tok';
    mockSegments = ['(auth)', 'sign-in'];
    render(<AuthGate />);
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/lessons');
  });

  it('does not navigate when authenticated and already on tabs', () => {
    mockAuthState._hasHydrated = true;
    mockAuthState.accessToken = 'tok';
    mockSegments = ['(tabs)', 'lessons'];
    render(<AuthGate />);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  // Regression: the rule used to be "authenticated and not in (tabs) -> (tabs)",
  // which evicted every standalone route the moment it mounted. Tapping
  // "build your own path" landed the user back on the lessons tab.
  it('leaves an authenticated user on a standalone route such as /build', () => {
    mockAuthState._hasHydrated = true;
    mockAuthState.accessToken = 'tok';
    mockSegments = ['build'];
    render(<AuthGate />);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('leaves an authenticated user on /build-review', () => {
    mockAuthState._hasHydrated = true;
    mockAuthState.accessToken = 'tok';
    mockSegments = ['build-review'];
    render(<AuthGate />);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('still sends an unauthenticated user off a standalone route to sign-in', () => {
    mockAuthState._hasHydrated = true;
    mockAuthState.accessToken = null;
    mockSegments = ['build'];
    render(<AuthGate />);
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/sign-in');
  });

  it('navigates to sign-in when token cleared mid-session', () => {
    mockAuthState._hasHydrated = true;
    mockAuthState.accessToken = 'tok';
    mockSegments = ['(tabs)', 'lessons'];

    const { rerender } = render(<AuthGate />);
    expect(mockReplace).not.toHaveBeenCalled();

    mockAuthState.accessToken = null;
    act(() => {
      rerender(<AuthGate />);
    });
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/sign-in');
  });
});

describe('splash screen failures', () => {
  const Sentry = require('@sentry/react-native');
  const SplashScreen = require('expo-splash-screen');

  beforeEach(() => {
    jest.clearAllMocks();
    // A plain rejection outlives its test, so each test starts from the resolving defaults.
    SplashScreen.hideAsync.mockResolvedValue(true);
    SplashScreen.preventAutoHideAsync.mockResolvedValue(true);
    mockSegments = ['(tabs)', 'lessons'];
    mockAuthState = { _hasHydrated: true, accessToken: 'tok' };
  });

  it('logs a breadcrumb when hiding the splash screen rejects', async () => {
    SplashScreen.hideAsync.mockRejectedValue(new Error('no native splash'));
    const RootLayout = require('../_layout').default;
    render(<RootLayout />);
    await act(async () => {});
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
      category: 'splash',
      message: 'hideAsync failed',
      level: 'warning',
      data: { err: 'Error: no native splash' },
    });
  });

  it('logs a breadcrumb when preventing auto-hide rejects', async () => {
    SplashScreen.preventAutoHideAsync.mockRejectedValue(new Error('already hidden'));
    jest.isolateModules(() => { require('../_layout'); });
    await act(async () => {});
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
      category: 'splash',
      message: 'preventAutoHideAsync failed',
      level: 'warning',
      data: { err: 'Error: already hidden' },
    });
  });
});
