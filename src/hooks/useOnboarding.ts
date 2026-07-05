import { useMutation, useQuery } from '@tanstack/react-query';
import { trackService } from '@/services/track.service';
import { userService } from '@/services/user.service';
import { useAuthStore } from '@/store/auth.store';
import type { Seniority } from '@learning/shared';

export interface OnboardingInput {
  seniority: Seniority;
  trackIds: string[];
  timezone: string;
  preferredTime: string;
}

export function useSkills() {
  return useQuery({
    queryKey: ['skills'],
    queryFn: () => trackService.getSkills(),
  });
}

export function useCompleteOnboarding() {
  const setHasOnboarded = useAuthStore((s) => s.setHasOnboarded);

  return useMutation({
    mutationFn: async (input: OnboardingInput) => {
      await userService.updateSeniority(input.seniority);
      await userService.updateTracks(input.trackIds);
      await userService.updateProfile({
        timezone: input.timezone,
        preferredTime: input.preferredTime,
        onboardingCompleted: true,
      });
    },
    onSuccess: () => {
      setHasOnboarded(true);
    },
  });
}
