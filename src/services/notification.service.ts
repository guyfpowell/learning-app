import api from '@/lib/api';
import type { NotificationPreference } from '@learning/shared';

export type UpdatePreferencesInput = Pick<
  NotificationPreference,
  'enableDailyReminder' | 'enableStreak' | 'enableLessonAvailable'
>;

export const notificationService = {
  async getPreferences(): Promise<NotificationPreference> {
    const { data } = await api.get<NotificationPreference>('/notifications/preferences');
    return data;
  },

  async updatePreferences(prefs: UpdatePreferencesInput): Promise<NotificationPreference> {
    const { data } = await api.patch<NotificationPreference>('/notifications/preferences', prefs);
    return data;
  },
};
