/**
 * Auth gate — runs on every cold launch.
 * Waits for SecureStore rehydration, then routes based on stored session.
 */
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import { Spinner } from '@/components/ui/Spinner';

export default function Root() {
  const { _hasHydrated, accessToken, user, mustChangePassword } = useAuthStore();

  // Wait until Zustand has finished reading from SecureStore
  if (!_hasHydrated) {
    return <Spinner fullScreen />;
  }

  if (accessToken) {
    if (mustChangePassword) {
      return <Redirect href="/(auth)/set-password" />;
    }
    if (user?.role === 'RECIPIENT') {
      return <Redirect href="/(recipient)" />;
    }
    return <Redirect href="/(donor)" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}
