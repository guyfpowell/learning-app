import { useQuery } from '@tanstack/react-query';
import { userService, type UserProfile } from '@/services/user.service';

export function useProfile() {
  return useQuery<UserProfile>({
    queryKey: ['profile'],
    queryFn: () => userService.getMe(),
    staleTime: 60_000,
  });
}
