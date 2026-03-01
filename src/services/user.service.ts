import api from '@/lib/api';
import type { User } from '@/types';

/** Full user profile returned by GET /users/me */
export interface UserProfile extends User {
  /** Total amount donated across all time (pence). Included if backend provides it. */
  totalDonatedPence?: number;
}

export const userService = {
  async getMe(): Promise<UserProfile> {
    const { data } = await api.get<UserProfile>('/users/me');
    return data;
  },
};
