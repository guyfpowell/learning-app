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
  async setActiveTrack(skillId: string): Promise<void> {
    await api.patch('/enrollments/active', { skillId });
  },
  async skipTopic(skillId: string): Promise<TrackEnrollmentWithProgress[]> {
    const { data } = await api.post<TrackEnrollmentWithProgress[]>(`/enrollments/${skillId}/skip-topic`);
    return data;
  },
  async skipLevel(skillId: string): Promise<TrackEnrollmentWithProgress[]> {
    const { data } = await api.post<TrackEnrollmentWithProgress[]>(`/enrollments/${skillId}/skip-level`);
    return data;
  },
};
