import api from '@/lib/api';
import type { NotificationPreference, UpdateNotificationPreferencesRequest } from '@learning/shared';

export const notificationService = {
  async getPreferences(): Promise<NotificationPreference> {
    const { data } = await api.get<NotificationPreference>('/notifications/preferences');
    return data;
  },

  async updatePreferences(prefs: UpdateNotificationPreferencesRequest): Promise<NotificationPreference> {
    const { data } = await api.patch<NotificationPreference>('/notifications/preferences', prefs);
    return data;
  },
};
