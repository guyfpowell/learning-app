import api from '@/lib/api';
import { withIdempotencyKey } from '@/lib/idempotencyKey';
import type { AchievementKey, AchievementsResponse, UnseenAchievementsResponse } from '@learning/shared';

export const achievementService = {
  async getAchievements(): Promise<AchievementsResponse> {
    const { data } = await api.get<AchievementsResponse>('/achievements');
    return data;
  },

  async getUnseen(): Promise<UnseenAchievementsResponse> {
    const { data } = await api.get<UnseenAchievementsResponse>('/achievements/unseen');
    return data;
  },

  async markSeen(key: AchievementKey, idempotencyKey: string): Promise<void> {
    await api.post(`/achievements/${key}/seen`, undefined, withIdempotencyKey(idempotencyKey));
  },
};
