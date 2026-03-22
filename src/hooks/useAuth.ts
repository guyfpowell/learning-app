import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { authService, type LoginInput, type RegisterInput } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const router = useRouter();

  return useMutation({
    mutationFn: (input: LoginInput) => authService.login(input),
    onSuccess: ({ user, tokens }) => {
      setAuth(user, tokens.accessToken, tokens.refreshToken, tokens.mustChangePassword);
      if (tokens.mustChangePassword) {
        router.replace('/(auth)/set-password');
      } else if (user.role === 'RECIPIENT') {
        router.replace('/(recipient)');
      } else {
        router.replace('/(donor)');
      }
    },
  });
}

export function useSetPassword() {
  const setMustChangePassword = useAuthStore((s) => s.setMustChangePassword);
  const setAuth = useAuthStore((s) => s.setAuth);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  return useMutation({
    mutationFn: (input: { currentPin: string; newPassword: string }) =>
      authService.setPassword(input),
    onSuccess: (tokens) => {
      if (user) {
        setAuth(user, tokens.accessToken, tokens.refreshToken, false);
      } else {
        setMustChangePassword(false);
      }
      router.replace('/(recipient)');
    },
  });
}

export function useRegister() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const router = useRouter();

  return useMutation({
    mutationFn: (input: RegisterInput) => authService.register(input),
    onSuccess: ({ user, tokens }) => {
      setAuth(user, tokens.accessToken, tokens.refreshToken);
      router.replace('/(donor)');
    },
  });
}

export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      // Always clear — even if the server call fails
      clearAuth();
      queryClient.clear();
      router.replace('/(auth)/sign-in');
    },
  });
}
