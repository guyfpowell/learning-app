import api from '@/lib/api';
import type { WeekSummaryResponse } from '@learning/shared';

export const weekService = {
  async getWeek(): Promise<WeekSummaryResponse> {
    const { data } = await api.get<WeekSummaryResponse>('/users/me/week');
    return data;
  },
};
