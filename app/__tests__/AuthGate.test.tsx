import React, { act } from 'react';
import { render } from '@testing-library/react-native';

const mockReplace = jest.fn();
let mockSegments: string[] = [];
let mockAuthState = {
  _hasHydrated: false,
  accessToken: null as string | null,
  user: null as { role: string } | null,
  mustChangePassword: false,
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

jest.mock('@gorhom/bottom-sheet', () => ({
  BottomSheetModalProvider: ({ children }: any) => children,
}));

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: any) => children,
}));

jest.mock('@/providers/QueryProvider', () => ({
  QueryProvider: ({ children }: any) => children,
}));

jest.mock('@/providers/StripeWrapper', () => ({
  StripeWrapper: ({ children }: any) => children,
}));

jest.mock('@/theme', () => ({
  colors: { bg: '#F3F3F3', teal: '#1B5E72' },
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
    mockAuthState = {
      _hasHydrated: false,
      accessToken: null,
      user: null,
      mustChangePassword: false,
    };
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

  it('does not navigate when already on sign-in (no loop)', () => {
    mockAuthState._hasHydrated = true;
    mockAuthState.accessToken = null;
    mockSegments = ['(auth)', 'sign-in'];
    render(<AuthGate />);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('navigates to set-password when mustChangePassword is true and not on set-password', () => {
    mockAuthState._hasHydrated = true;
    mockAuthState.accessToken = 'tok';
    mockAuthState.mustChangePassword = true;
    mockSegments = ['(auth)', 'sign-in'];
    render(<AuthGate />);
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/set-password');
  });

  it('does not navigate when mustChangePassword and already on set-password (no loop)', () => {
    mockAuthState._hasHydrated = true;
    mockAuthState.accessToken = 'tok';
    mockAuthState.mustChangePassword = true;
    mockSegments = ['(auth)', 'set-password'];
    render(<AuthGate />);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('navigates to /(recipient) for authenticated RECIPIENT on auth screen', () => {
    mockAuthState._hasHydrated = true;
    mockAuthState.accessToken = 'tok';
    mockAuthState.mustChangePassword = false;
    mockAuthState.user = { role: 'RECIPIENT' };
    mockSegments = ['(auth)', 'sign-in'];
    render(<AuthGate />);
    expect(mockReplace).toHaveBeenCalledWith('/(recipient)');
  });

  it('navigates to /(donor) for authenticated DONOR on auth screen', () => {
    mockAuthState._hasHydrated = true;
    mockAuthState.accessToken = 'tok';
    mockAuthState.mustChangePassword = false;
    mockAuthState.user = { role: 'DONOR' };
    mockSegments = ['(auth)', 'sign-in'];
    render(<AuthGate />);
    expect(mockReplace).toHaveBeenCalledWith('/(donor)');
  });

  it('does not navigate when RECIPIENT already on recipient home', () => {
    mockAuthState._hasHydrated = true;
    mockAuthState.accessToken = 'tok';
    mockAuthState.mustChangePassword = false;
    mockAuthState.user = { role: 'RECIPIENT' };
    mockSegments = ['(recipient)', 'index'];
    render(<AuthGate />);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('does not navigate when DONOR already on donor home', () => {
    mockAuthState._hasHydrated = true;
    mockAuthState.accessToken = 'tok';
    mockAuthState.mustChangePassword = false;
    mockAuthState.user = { role: 'DONOR' };
    mockSegments = ['(donor)', 'index'];
    render(<AuthGate />);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('does not redirect when authenticated donor is on recipient/[id]', () => {
    mockAuthState._hasHydrated = true;
    mockAuthState.accessToken = 'tok';
    mockAuthState.mustChangePassword = false;
    mockAuthState.user = { role: 'DONOR' };
    mockSegments = ['recipient', 'abc123'];
    render(<AuthGate />);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('does not redirect when authenticated donor is on donate/[id]', () => {
    mockAuthState._hasHydrated = true;
    mockAuthState.accessToken = 'tok';
    mockAuthState.mustChangePassword = false;
    mockAuthState.user = { role: 'DONOR' };
    mockSegments = ['donate', 'abc123'];
    render(<AuthGate />);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('does not redirect when authenticated donor is on donation/[id]', () => {
    mockAuthState._hasHydrated = true;
    mockAuthState.accessToken = 'tok';
    mockAuthState.mustChangePassword = false;
    mockAuthState.user = { role: 'DONOR' };
    mockSegments = ['donation', 'abc123'];
    render(<AuthGate />);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('navigates to sign-in when token cleared mid-session', () => {
    mockAuthState._hasHydrated = true;
    mockAuthState.accessToken = 'tok';
    mockAuthState.user = { role: 'DONOR' };
    mockSegments = ['(donor)', 'index'];

    const { rerender } = render(<AuthGate />);
    expect(mockReplace).not.toHaveBeenCalled();

    mockAuthState.accessToken = null;
    act(() => {
      rerender(<AuthGate />);
    });
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/sign-in');
  });
});
