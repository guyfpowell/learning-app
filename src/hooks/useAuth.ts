import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authService, type LoginInput, type RegisterInput } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: (input: LoginInput) => authService.login(input),
    onSuccess: ({ user, token }) => {
      setAuth(user, token, '');
    },
  });
}

export function useRegister() {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: (input: RegisterInput) => authService.register(input),
    onSuccess: ({ user, token }) => {
      setAuth(user, token, '');
    },
  });
}

export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      // Always clear — even if the call fails. AuthGate handles redirect to sign-in.
      clearAuth();
      queryClient.clear();
    },
  });
}
