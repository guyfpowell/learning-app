import React from 'react';
import { render } from '@testing-library/react-native';

let capturedStackChildren: React.ReactNode = null;

jest.mock('expo-router', () => ({
  Stack: Object.assign(
    ({ children }: { children?: React.ReactNode }) => {
      capturedStackChildren = children;
      return null;
    },
    { Screen: () => null }
  ),
  useSegments: () => [],
  usePathname: () => '/',
  useRouter: () => ({ replace: jest.fn() }),
}));

jest.mock('@/store/auth.store', () => ({
  useAuthStore: () => ({ _hasHydrated: false, accessToken: null }),
}));

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  wrap: jest.fn((c: unknown) => c),
}));

jest.mock('@expo-google-fonts/hanken-grotesk', () => ({
  HankenGrotesk_400Regular: undefined,
  HankenGrotesk_500Medium: undefined,
  HankenGrotesk_600SemiBold: undefined,
  HankenGrotesk_700Bold: undefined,
  useFonts: jest.fn(() => [true, null]),
}));

jest.mock('@expo-google-fonts/bricolage-grotesque', () => ({
  BricolageGrotesque_600SemiBold: undefined,
  BricolageGrotesque_700Bold: undefined,
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

type ScreenProps = { name: string; options?: { presentation?: string } };

/** The `<Stack.Screen>` elements the root layout declares, by route name. */
function declaredScreens(): ScreenProps[] {
  return React.Children.toArray(capturedStackChildren)
    .flatMap((c) => (React.isValidElement<ScreenProps>(c) ? [c.props] : []));
}

describe('root layout (ADR-016)', () => {
  beforeEach(() => {
    capturedStackChildren = null;
    const RootLayout = require('../_layout').default;
    render(<RootLayout />);
  });

  it.each(['lesson/[id]', 'track/[kind]/[id]', 'paywall'])('declares %s in the root Stack', (name) => {
    expect(declaredScreens().map((s) => s.name)).toContain(name);
  });

  it('presents the paywall as a modal', () => {
    const paywall = declaredScreens().find((s) => s.name === 'paywall');
    expect(paywall?.options?.presentation).toBe('modal');
  });
});
