import api from '@/lib/api';
import type { EnrollTrackRequest, ActivePathRef, SkipRequest, SkipScope, SkillWithAccess, TopicFeedbackRequest, TrackContents, UserPath, UserPathKind } from '@learning/shared';

/** One skip: which path, how much of it, and the reason the person picked (079c). */
export type SkipCall = ActivePathRef & SkipRequest & { scope: SkipScope };

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
    const body: EnrollTrackRequest = { skillId };
    await api.post('/enrollments', body);
  },

  /** Makes a path of either kind the active one. */
  async setActivePath(ref: ActivePathRef): Promise<void> {
    await api.patch('/enrollments/active', ref);
  },

  /** Removes a path: a track is unenrolled, a custom path is archived server-side. */
  async removePath({ kind, id }: ActivePathRef): Promise<void> {
    await api.delete(`/enrollments/${kind}/${id}`);
  },

  /**
   * Skips from the next lesson of either kind of path: the lesson (076h), the rest of its topic,
   * or the rest of its level. Level is tracks only: a custom path is dependency-ordered (C10).
   */
  async skip({ kind, id, scope, reason }: SkipCall): Promise<UserPath> {
    const body: SkipRequest = { reason };
    const { data } = await api.post<UserPath>(`/enrollments/${kind}/${id}/skip-${scope}`, body);
    return data;
  },

  /**
   * Writes the person's answer for a topic that just ended (079d). Albert's paths only: a
   * pre-built track has no topic end, so the route is always `custom`.
   */
  async topicFeedback(planId: string, body: TopicFeedbackRequest): Promise<void> {
    await api.post(`/enrollments/custom/${planId}/topic-feedback`, body);
  },

  /** GET /enrollments/:kind/:id/contents — the full lesson tree for a path. */
  async getTrackContents(kind: UserPathKind, id: string): Promise<TrackContents> {
    const { data } = await api.get<TrackContents>(`/enrollments/${kind}/${id}/contents`);
    return data;
  },
};
