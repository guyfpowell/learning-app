import api from '@/lib/api';
import type { NotificationPreference, RegisterPushTokenRequest, UpdateNotificationPreferencesRequest } from '@learning/shared';
import { withIdempotencyKey } from '@/lib/idempotencyKey';

export const notificationService = {
  async getPreferences(): Promise<NotificationPreference> {
    const { data } = await api.get<NotificationPreference>('/notifications/preferences');
    return data;
  },

  async updatePreferences(prefs: UpdateNotificationPreferencesRequest, idempotencyKey: string): Promise<NotificationPreference> {
    const { data } = await api.patch<NotificationPreference>('/notifications/preferences', prefs, withIdempotencyKey(idempotencyKey));
    return data;
  },

  async registerPushToken(body: RegisterPushTokenRequest, idempotencyKey: string): Promise<void> {
    await api.post('/notifications/push-token', body, withIdempotencyKey(idempotencyKey));
  },
};
