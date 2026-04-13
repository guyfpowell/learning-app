import api from '@/lib/api';
import type { UserProgressStats } from '@learning/shared';

export const progressService = {
  async getProgress(): Promise<UserProgressStats> {
    const { data } = await api.get<UserProgressStats>('/users/progress');
    return data;
  },
};
