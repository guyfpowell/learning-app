import api, { BACKGROUND_REQUEST } from '@/lib/api';
import type { UserAuth, UserProfile, Seniority, DeleteAccountPreflight, DeleteAccountRequest } from '@learning/shared';

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

  /**
   * Silent timezone sync — ticket 069 items 1+2. Onboarding was the only thing
   * that set the timezone; without it reminders fall back to a server default.
   * Marked as background so a failure here can never sign the user out.
   */
  async syncTimezone(timezone: string): Promise<void> {
    await api.patch('/users/profile', { timezone }, BACKGROUND_REQUEST);
  },

  async getDeletePreflight(): Promise<DeleteAccountPreflight> {
    const { data } = await api.get<DeleteAccountPreflight>('/users/me/delete-preflight');
    return data;
  },

  async deleteAccount(password: string): Promise<void> {
    await api.delete('/users/me', { data: { password } satisfies DeleteAccountRequest });
  },
};
