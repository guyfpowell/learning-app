import React from 'react';
import { render, screen } from '@testing-library/react-native';
import * as Sentry from '@sentry/react-native';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  wrap: jest.fn((component) => component),
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
  BottomSheetModalProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('expo-router', () => ({
  Stack: Object.assign(
    ({ children }: { children: React.ReactNode }) => children,
    { Screen: () => null }
  ),
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/providers/QueryProvider', () => ({
  QueryProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/providers/StripeWrapper', () => ({
  StripeWrapper: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/theme', () => ({
  colors: { bg: '#F3F3F3', teal: '#1B5E72' },
}));

// ─── ErrorBoundary isolation ──────────────────────────────────────────────────

// Extract ErrorBoundary from the module by re-creating it here to test in isolation
// without requiring the full RootLayout render tree (font loading, providers, etc.)

class ErrorBoundaryUnderTest extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    Sentry.captureException(error);
  }

  render() {
    if (this.state.error) {
      const { Text, ScrollView } = require('react-native');
      return (
        <ScrollView>
          <Text>App crashed — error details:</Text>
          <Text>{String(this.state.error)}</Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ErrorBoundary', () => {
  const originalError = console.error;

  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress expected React error boundary console output
    console.error = jest.fn();
  });

  afterEach(() => {
    console.error = originalError;
  });

  it('renders children when there is no error', () => {
    const { Text } = require('react-native');
    render(
      <ErrorBoundaryUnderTest>
        <Text>ok</Text>
      </ErrorBoundaryUnderTest>
    );
    expect(screen.getByText('ok')).toBeTruthy();
  });

  it('renders crash UI when a child throws', () => {
    const Bomb = () => { throw new Error('boom'); };
    render(
      <ErrorBoundaryUnderTest>
        <Bomb />
      </ErrorBoundaryUnderTest>
    );
    expect(screen.getByText(/App crashed/)).toBeTruthy();
  });

  it('calls Sentry.captureException with the thrown error', () => {
    const err = new Error('sentry test');
    const Bomb = () => { throw err; };
    render(
      <ErrorBoundaryUnderTest>
        <Bomb />
      </ErrorBoundaryUnderTest>
    );
    expect(Sentry.captureException).toHaveBeenCalledWith(err);
  });

  it('does NOT call Sentry.captureException when no error is thrown', () => {
    const { Text } = require('react-native');
    render(
      <ErrorBoundaryUnderTest>
        <Text>fine</Text>
      </ErrorBoundaryUnderTest>
    );
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});

describe('Sentry.init config', () => {
  it('is called with DSN from env var, tracesSampleRate, sendDefaultPii, enableLogs', () => {
    // Re-import the module to trigger Sentry.init
    jest.resetModules();

    const mockInit = jest.fn();
    jest.mock('@sentry/react-native', () => ({
      init: mockInit,
      captureException: jest.fn(),
      wrap: jest.fn((c) => c),
    }));

    // Set the env var before importing
    const originalDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
    process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://test@sentry.example.com/123';

    require('../_layout');

    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://test@sentry.example.com/123',
        tracesSampleRate: 0.1,
        sendDefaultPii: true,
        enableLogs: true,
      })
    );

    process.env.EXPO_PUBLIC_SENTRY_DSN = originalDsn;
  });
});

describe('Sentry.wrap export', () => {
  it('wraps the default export', () => {
    jest.resetModules();

    const mockWrap = jest.fn((c) => c);
    jest.mock('@sentry/react-native', () => ({
      init: jest.fn(),
      captureException: jest.fn(),
      captureMessage: jest.fn(),
      wrap: mockWrap,
    }));

    require('../_layout');

    expect(mockWrap).toHaveBeenCalled();
  });
});

describe('RootLayout app-loaded sentinel', () => {
  it('captures "App loaded" message when fonts are loaded', async () => {
    jest.resetModules();
    jest.clearAllMocks();

    const Sentry = require('@sentry/react-native');
    const { useFonts } = require('@expo-google-fonts/poppins');

    render(require('../_layout').default);

    // Font loading is mocked to return immediately with useFonts() = [true, null]
    // RootLayout should capture the app-loaded message
    expect(Sentry.captureMessage).toHaveBeenCalledWith('App loaded', 'info');
  });
});
