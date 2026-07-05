import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationService, type UpdatePreferencesInput } from '@/services/notification.service';

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ['notifications', 'preferences'],
    queryFn: () => notificationService.getPreferences(),
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (prefs: UpdatePreferencesInput) => notificationService.updatePreferences(prefs),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', 'preferences'] }),
  });
}
