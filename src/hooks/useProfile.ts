import { useQuery } from '@tanstack/react-query';
import type { UpdateProfileRequest } from '@learning/shared';
import { userService } from '@/services/user.service';
import { USER_PROFILE_QUERY_KEY } from '@/lib/queryKeys';
import { UPDATE_PROFILE_WRITE } from '@/lib/safeWrites';
import { useSafeWrite } from '@/hooks/useSafeWrite';

export function useProfile() {
  return useQuery({
    queryKey: USER_PROFILE_QUERY_KEY,
    queryFn: () => userService.getProfile(),
  });
}

/** Safe to send again (ADR-021 Decision 4): waits through a drop, one write at a time, survives a restart. */
export function useUpdateProfile() {
  return useSafeWrite<UpdateProfileRequest, void>(UPDATE_PROFILE_WRITE);
}
