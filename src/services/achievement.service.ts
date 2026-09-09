import api from '@/lib/api';
import type { AchievementsResponse } from '@learning/shared';

export const achievementService = {
  async getAchievements(): Promise<AchievementsResponse> {
    const { data } = await api.get<AchievementsResponse>('/achievements');
    return data;
  },
};
