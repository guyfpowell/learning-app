import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { trackService } from '@/services/track.service';

export function useSkills() {
  return useQuery({
    queryKey: ['skills'],
    queryFn: () => trackService.getSkills(),
  });
}

export function useEnrollments() {
  return useQuery({
    queryKey: ['enrollments'],
    queryFn: () => trackService.getEnrollments(),
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
