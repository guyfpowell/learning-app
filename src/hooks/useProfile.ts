import { useMutation, useQuery } from '@tanstack/react-query';
import { userService } from '@/services/user.service';

export function useProfile() {
  return useQuery({
    queryKey: ['user-profile'],
    queryFn: () => userService.getProfile(),
  });
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: (input: { preferredTime: string; timezone: string }) =>
      userService.updateProfile(input),
  });
}
