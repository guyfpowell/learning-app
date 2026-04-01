import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authService, type LoginInput, type RegisterInput } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: (input: LoginInput) => authService.login(input),
    onSuccess: ({ user, tokens }) => {
      setAuth(user, tokens.accessToken, tokens.refreshToken, tokens.mustChangePassword);
    },
  });
}

export function useSetPassword() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: (input: { currentPin: string; newPassword: string }) =>
      authService.setPassword(input),
    onSuccess: (tokens) => {
      // user is always present here — set-password is only reachable after authentication
      setAuth(user!, tokens.accessToken, tokens.refreshToken, false);
    },
  });
}

export function useRegister() {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: (input: RegisterInput) => authService.register(input),
    onSuccess: ({ user, tokens }) => {
      setAuth(user, tokens.accessToken, tokens.refreshToken);
    },
  });
}

export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      // Always clear — even if the server call fails. AuthGate handles redirect to sign-in.
      clearAuth();
      queryClient.clear();
    },
  });
}
