import { useQuery, useMutation } from '@tanstack/react-query';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { CURRENT_USER_QUERY_KEY } from '@/lib/queryKeys';

export function useCurrentUser() {
  const accessToken = useAuthStore((s) => s.accessToken);

  return useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: authService.getMe,
    enabled: !!accessToken,
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: () => authService.resendVerification(),
  });
}
