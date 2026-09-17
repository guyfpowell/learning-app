import api from '@/lib/api';
import type { XpResponse } from '@learning/shared';

export const xpService = {
  async getXp(): Promise<XpResponse> {
    const { data } = await api.get<XpResponse>('/users/xp');
    return data;
  },
};
