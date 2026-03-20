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

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
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

export default function RootLayoutWithErrorBoundary() {
  return <ErrorBoundary><RootLayout /></ErrorBoundary>;
}
