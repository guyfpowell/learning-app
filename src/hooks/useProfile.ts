import { useMutation, useQuery } from '@tanstack/react-query';
import { userService } from '@/services/user.service';
import { USER_PROFILE_QUERY_KEY } from '@/lib/queryKeys';

export function useProfile() {
  return useQuery({
    queryKey: USER_PROFILE_QUERY_KEY,
    queryFn: () => userService.getProfile(),
  });
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: (input: { preferredTime: string; timezone: string }) =>
      userService.updateProfile(input),
  });
}
