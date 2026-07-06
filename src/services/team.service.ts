import api from '@/lib/api';
import type { TeamSummary, MemberProgress, SkillGap, LeaderboardEntry } from '@learning/shared';

const TEAM_ID = 'demo-team';

export const teamService = {
  getSummary: () =>
    api.get<TeamSummary>(`/teams/${TEAM_ID}/analytics`).then((r) => r.data),
  getMemberProgress: () =>
    api.get<MemberProgress[]>(`/teams/${TEAM_ID}/members/progress`).then((r) => r.data),
  getSkillGaps: () =>
    api.get<SkillGap[]>(`/teams/${TEAM_ID}/skill-gaps`).then((r) => r.data),
  getLeaderboard: () =>
    api.get<LeaderboardEntry[]>(`/teams/${TEAM_ID}/leaderboard`).then((r) => r.data),
};
