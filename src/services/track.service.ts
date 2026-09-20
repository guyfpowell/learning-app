import api from '@/lib/api';
import type { ActivePathRef, SkillWithAccess, TrackContents, UserPath, UserPathKind } from '@learning/shared';

export const trackService = {
  async getSkills(): Promise<SkillWithAccess[]> {
    const { data } = await api.get<SkillWithAccess[]>('/lessons/skills');
    return data;
  },

  /**
   * GET /enrollments returns one array of paths, of both kinds, active first
   * (ADR-009 C2). There is no longer a second `customPlans` field to merge —
   * merging two shapes in the client is what left custom paths out of Progress
   * and without a next-lesson CTA on Home.
   */
  async getPaths(): Promise<UserPath[]> {
    const { data } = await api.get<UserPath[]>('/enrollments');
    return data ?? [];
  },

  async enroll(skillId: string): Promise<void> {
    await api.post('/enrollments', { skillId });
  },

  /** Makes a path of either kind the active one. */
  async setActivePath(ref: ActivePathRef): Promise<void> {
    await api.patch('/enrollments/active', ref);
  },

  /** Removes a path: a track is unenrolled, a custom path is archived server-side. */
  async removePath({ kind, id }: ActivePathRef): Promise<void> {
    await api.delete(`/enrollments/${kind}/${id}`);
  },

  async skipTopic({ kind, id }: ActivePathRef): Promise<UserPath> {
    const { data } = await api.post<UserPath>(`/enrollments/${kind}/${id}/skip-topic`);
    return data;
  },

  /** Tracks only — a custom path is dependency-ordered and has no levels (C10). */
  async skipLevel({ kind, id }: ActivePathRef): Promise<UserPath> {
    const { data } = await api.post<UserPath>(`/enrollments/${kind}/${id}/skip-level`);
    return data;
  },

  /** Skips exactly the next lesson of either kind of path (076h). */
  async skipLesson({ kind, id }: ActivePathRef): Promise<UserPath> {
    const { data } = await api.post<UserPath>(`/enrollments/${kind}/${id}/skip-lesson`);
    return data;
  },

  /** GET /enrollments/:kind/:id/contents — the full lesson tree for a path. */
  async getTrackContents(kind: UserPathKind, id: string): Promise<TrackContents> {
    const { data } = await api.get<TrackContents>(`/enrollments/${kind}/${id}/contents`);
    return data;
  },
};
