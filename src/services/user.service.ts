import api from '@/lib/api';
import type { UserAuth, UserProfile } from '@learning/shared';

export const userService = {
  async getMe(): Promise<UserAuth> {
    const { data } = await api.get<UserAuth>('/users/me');
    return data;
  },

  async getProfile(): Promise<UserProfile> {
    const { data } = await api.get<UserProfile>('/users/profile');
    return data;
  },
};
