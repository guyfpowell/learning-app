import api from '@/lib/api';
import type { DecideProposalResponse, PathProposal, ProposalDecision, ProposalDecisionRequest, ProposalStage } from '@learning/shared';

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

  /** Accept or decline the change or the move. Returns the refreshed path and what the decision earned, side by side (ADR-022 Amendment 2). */
  async decide({ proposalId, stage, decision }: ProposalCall): Promise<DecideProposalResponse> {
    const body: ProposalDecisionRequest = { decision };
    const { data } = await api.post<DecideProposalResponse>(`/proposals/${proposalId}/${stage}`, body);
    return data;
  },
};
