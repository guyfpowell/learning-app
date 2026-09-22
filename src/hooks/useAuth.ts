import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService, type LoginInput, type RegisterInput } from '@/services/auth.service';
import { userService } from '@/services/user.service';
import { useAuthStore } from '@/store/auth.store';

/**
 * Onboarding used to collect the timezone. With it gone, the device is the only
 * source, so sync it on registration. Best-effort: a failure here must never
 * block sign-up, it only means reminders fall back to the server default until
 * the user opens Settings.
 */
function syncTimezone() {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (!timezone) return;
  void userService.syncTimezone(timezone).catch(() => {});
}

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: (input: LoginInput) => authService.login(input),
    onSuccess: ({ user, token }) => {
      setAuth(user, token);
    },
  });
}

export function useRegister() {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: (input: RegisterInput) => authService.register(input),
    onSuccess: ({ user, token }) => {
      setAuth(user, token);
      syncTimezone();
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

export function useDeleteAccountPreflight() {
  return useQuery({
    queryKey: ['delete-preflight'],
    queryFn: () => userService.getDeletePreflight(),
    staleTime: 0,
  });
}

export function useDeleteAccount() {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (password: string) => userService.deleteAccount(password),
    onSuccess: () => {
      clearAuth();
      queryClient.clear();
    },
  });
}
