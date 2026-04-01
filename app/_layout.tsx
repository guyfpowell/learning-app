import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_700Bold,
  useFonts,
} from '@expo-google-fonts/poppins';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack, useSegments, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Component, useEffect } from 'react';
import type { ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ScrollView, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@/theme';
import { QueryProvider } from '@/providers/QueryProvider';
import { StripeWrapper } from '@/providers/StripeWrapper';
import { useAuthStore } from '@/store/auth.store';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  sendDefaultPii: true,
  enableLogs: true,
  tracesSampleRate: 0.1,
});


class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { Sentry.captureException(error); }
  render() {
    if (this.state.error) {
      return (
        <ScrollView style={{ flex: 1, backgroundColor: '#fff', padding: 24, paddingTop: 60 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 16, color: 'red', marginBottom: 8 }}>
            App crashed — error details:
          </Text>
          <Text style={{ fontFamily: 'Courier', fontSize: 12, color: '#333' }}>
            {String(this.state.error)}
          </Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

SplashScreen.preventAutoHideAsync();

/**
 * Single source of truth for auth-driven routing.
 * Watches Zustand auth state and navigates reactively — no routing in mutation callbacks.
 *
 * Rules (priority order):
 * 1. Not hydrated → do nothing (spinner visible at root)
 * 2. No token + not on auth screen → sign-in
 * 3. mustChangePassword + not on set-password → set-password
 * 4. Authenticated + no password change required + not on role home → route by role
 */
export function AuthGate() {
  const { _hasHydrated, accessToken, user, mustChangePassword } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!_hasHydrated) return;

    const inAuthGroup      = segments[0] === '(auth)';
    const inDonorGroup     = segments[0] === '(donor)';
    const inRecipientGroup = segments[0] === '(recipient)';
    const onSetPassword    = inAuthGroup && segments[1] === 'set-password';

    if (!accessToken) {
      if (!inAuthGroup) router.replace('/(auth)/sign-in');
      return;
    }

    if (mustChangePassword) {
      if (!onSetPassword) router.replace('/(auth)/set-password');
      return;
    }

    // Authenticated, no password change required — move away from auth screens and root
    const onRoleHome = inDonorGroup || inRecipientGroup;
    if (!onRoleHome) {
      router.replace(user?.role === 'RECIPIENT' ? '/(recipient)' : '/(donor)');
    }
  }, [_hasHydrated, accessToken, mustChangePassword, user?.role, segments[0], segments[1]]);

  return null;
}

function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
      Sentry.captureMessage('App loaded', 'info');
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StripeWrapper>
        <QueryProvider>
          <BottomSheetModalProvider>
            <StatusBar style="dark" backgroundColor={colors.bg} />
            <AuthGate />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(donor)" />
              <Stack.Screen name="(recipient)" />
              <Stack.Screen name="recipient/[id]" />
              <Stack.Screen name="donate/[id]" />
              <Stack.Screen name="donation/[id]" />
            </Stack>
          </BottomSheetModalProvider>
        </QueryProvider>
      </StripeWrapper>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(function RootLayoutWithErrorBoundary() {
  return <ErrorBoundary><RootLayout /></ErrorBoundary>;
});
