import api from '@/lib/api';
import type { CustomPlanForHome, SkillWithAccess, TrackEnrollmentWithProgress } from '@learning/shared';

export const trackService = {
  async getSkills(): Promise<SkillWithAccess[]> {
    const { data } = await api.get<SkillWithAccess[]>('/lessons/skills');
    return data;
  },
  /**
   * GET /enrollments returns `{ success, data: enrollments[], customPlans? }`.
   * The api.ts interceptor unwraps this to:
   *   - `enrollments[]`  when no customPlans are present (no extra top-level keys)
   *   - `{ data: enrollments[], customPlans }` when customPlans are present
   * Both cases are normalised here so callers always receive a consistent shape.
   */
  async getEnrollments(): Promise<{ enrollments: TrackEnrollmentWithProgress[]; customPlans: CustomPlanForHome[] }> {
    const res = await api.get('/enrollments');
    if (Array.isArray(res.data)) {
      return { enrollments: res.data as TrackEnrollmentWithProgress[], customPlans: [] };
    }
    const d = res.data as { data: TrackEnrollmentWithProgress[]; customPlans?: CustomPlanForHome[] };
    return { enrollments: d.data ?? [], customPlans: d.customPlans ?? [] };
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
