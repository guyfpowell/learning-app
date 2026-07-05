import api from '@/lib/api';
import type { UserAuth, UserProfile, Seniority } from '@learning/shared';

export interface UpdateProfileInput {
  preferredTime?: string;
  timezone?: string;
  learningStyle?: string;
  onboardingCompleted?: boolean;
}

export const userService = {
  async getMe(): Promise<UserAuth> {
    const { data } = await api.get<UserAuth>('/users/me');
    return data;
  },

  async getProfile(): Promise<UserProfile> {
    const { data } = await api.get<UserProfile>('/users/profile');
    return data;
  },

  async updateSeniority(seniority: Seniority): Promise<void> {
    await api.patch('/users/me/seniority', { seniority });
  },

  async updateTracks(trackIds: string[]): Promise<void> {
    await api.put('/users/me/tracks', { trackIds });
  },

  async updateProfile(input: UpdateProfileInput): Promise<void> {
    await api.patch('/users/profile', input);
  },
};
