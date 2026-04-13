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
    ({ children }: any) => children ?? null,
    { Screen: () => null }
  ),
  useSegments: () => mockSegments,
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('@/store/auth.store', () => ({
  useAuthStore: jest.fn((selector?: any) =>
    selector ? selector(mockAuthState) : mockAuthState
  ),
}));

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  wrap: jest.fn((c: any) => c),
}));

jest.mock('@expo-google-fonts/poppins', () => ({
  Poppins_400Regular: undefined,
  Poppins_500Medium: undefined,
  Poppins_700Bold: undefined,
  useFonts: jest.fn(() => [true, null]),
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}));

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: any) => children,
}));

jest.mock('@/providers/QueryProvider', () => ({
  QueryProvider: ({ children }: any) => children,
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

  it('navigates to /(tabs) when authenticated and at root', () => {
    mockAuthState._hasHydrated = true;
    mockAuthState.accessToken = 'tok';
    mockSegments = [];
    render(<AuthGate />);
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });

  it('navigates to /(tabs) when authenticated and on auth screen', () => {
    mockAuthState._hasHydrated = true;
    mockAuthState.accessToken = 'tok';
    mockSegments = ['(auth)', 'sign-in'];
    render(<AuthGate />);
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });

  it('does not navigate when authenticated and already on tabs', () => {
    mockAuthState._hasHydrated = true;
    mockAuthState.accessToken = 'tok';
    mockSegments = ['(tabs)', 'lessons'];
    render(<AuthGate />);
    expect(mockReplace).not.toHaveBeenCalled();
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
