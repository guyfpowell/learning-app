import api from '@/lib/api';
import type { CustomPath, PathProposal, ProposalDecision, ProposalDecisionRequest, ProposalStage } from '@learning/shared';

/** One decision: on which proposal, on its change or its move, and the answer. */
export interface ProposalCall {
  proposalId: string;
  stage: ProposalStage;
  decision: ProposalDecision;
}

export const proposalService = {
  /** GET /track-plans/:id/proposal — the checked suggestion on a custom path, or null. */
  async getProposal(planId: string): Promise<PathProposal | null> {
    const { data } = await api.get<PathProposal | null>(`/track-plans/${planId}/proposal`);
    return data;
  },

  /** Accept or decline the change or the move. Returns the refreshed path. */
  async decide({ proposalId, stage, decision }: ProposalCall): Promise<CustomPath> {
    const body: ProposalDecisionRequest = { decision };
    const { data } = await api.post<CustomPath>(`/proposals/${proposalId}/${stage}`, body);
    return data;
  },
};
