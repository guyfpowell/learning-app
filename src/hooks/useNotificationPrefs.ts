import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UpdateNotificationPreferencesRequest } from '@learning/shared';
import { notificationService } from '@/services/notification.service';

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ['notifications', 'preferences'],
    queryFn: () => notificationService.getPreferences(),
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (prefs: UpdateNotificationPreferencesRequest) => notificationService.updatePreferences(prefs),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', 'preferences'] }),
  });
}
