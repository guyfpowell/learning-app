import api from '@/lib/api';
import type { CreateSituationChangeRequest, SituationChange } from '@learning/shared';

export const situationChangeService = {
  /** POST /track-plans/:id/situation-changes — stores the words and starts Albert's look; returns the change, `running`. */
  async create(planId: string, text: string): Promise<SituationChange> {
    const body: CreateSituationChangeRequest = { text };
    const { data } = await api.post<SituationChange>(`/track-plans/${planId}/situation-changes`, body);
    return data;
  },

  /** GET /track-plans/:id/situation-changes/latest — the newest change on the path with its outcome, or null. */
  async getLatest(planId: string): Promise<SituationChange | null> {
    const { data } = await api.get<SituationChange | null>(`/track-plans/${planId}/situation-changes/latest`);
    return data;
  },
};
