import api from '@/lib/api';
import type { SkillWithAccess, TrackEnrollmentWithProgress } from '@learning/shared';

export const trackService = {
  async getSkills(): Promise<SkillWithAccess[]> {
    const { data } = await api.get<SkillWithAccess[]>('/lessons/skills');
    return data;
  },
  async getEnrollments(): Promise<TrackEnrollmentWithProgress[]> {
    const { data } = await api.get<TrackEnrollmentWithProgress[]>('/enrollments');
    return data;
  },
  async enroll(skillId: string): Promise<void> {
    await api.post('/enrollments', { skillId });
  },
};
