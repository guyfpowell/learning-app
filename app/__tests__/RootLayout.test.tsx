import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { useSplashStore } from '@/store/splash.store';

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

jest.mock('@expo-google-fonts/schibsted-grotesk', () => ({
  SchibstedGrotesk_400Regular: undefined,
  SchibstedGrotesk_500Medium: undefined,
  SchibstedGrotesk_600SemiBold: undefined,
  SchibstedGrotesk_700Bold: undefined,
  SchibstedGrotesk_800ExtraBold: undefined,
  SchibstedGrotesk_900Black: undefined,
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

jest.mock('@/components/achievements/CelebrationQueue', () => {
  const { View } = jest.requireActual('react-native');
  return { CelebrationQueue: () => <View testID="celebration-queue" /> };
});

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

describe('root layout splash', () => {
  it('shows the splash on launch and holds celebrations back until it has gone', () => {
    const RootLayout = require('../_layout').default;
    render(<RootLayout />);
    expect(screen.getByTestId('ascent-splash')).toBeTruthy();
    expect(screen.queryByTestId('celebration-queue')).toBeNull();
    act(() => useSplashStore.getState().done());
    expect(screen.queryByTestId('ascent-splash')).toBeNull();
    expect(screen.getByTestId('celebration-queue')).toBeTruthy();
  });
});
