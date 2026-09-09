import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { trackService } from '@/services/track.service';

export function useSkills() {
  return useQuery({
    queryKey: ['skills'],
    queryFn: () => trackService.getSkills(),
  });
}

/** Returns the user's track enrollments. Shape unchanged from before ticket 071. */
export function useEnrollments() {
  return useQuery({
    queryKey: ['enrollments'],
    queryFn: () => trackService.getEnrollments(),
    select: (d) => d.enrollments,
  });
}

/** Returns custom-built plans from the Albert track builder (ticket 071).
 *  Shares the ['enrollments'] cache with useEnrollments — one network call. */
export function useCustomPlans() {
  return useQuery({
    queryKey: ['enrollments'],
    queryFn: () => trackService.getEnrollments(),
    select: (d) => d.customPlans,
  });
}

export function useEnroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (skillId: string) => trackService.enroll(skillId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['skills'] });
    },
  });
}

export function useSetActiveTrack() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (skillId: string) => trackService.setActiveTrack(skillId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['skills'] });
    },
  });
}

export function useSkipTopic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (skillId: string) => trackService.skipTopic(skillId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    },
  });
}

export function useSkipLevel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (skillId: string) => trackService.skipLevel(skillId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    },
  });
}
