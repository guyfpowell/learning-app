import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_700Bold,
  useFonts,
} from '@expo-google-fonts/poppins';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Component, useEffect } from 'react';
import type { ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ScrollView, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@/theme';
import { QueryProvider } from '@/providers/QueryProvider';
import { StripeWrapper } from '@/providers/StripeWrapper';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // 10% sampling for performance traces — avoids quota noise
  tracesSampleRate: 0.1,

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
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

function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
      // Signal to Sentry that app has loaded successfully
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
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(donor)" />
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
