import { useQuery } from '@tanstack/react-query';
import { teamService } from '@/services/team.service';

export function useTeamSummary() {
  return useQuery({ queryKey: ['team', 'summary'], queryFn: teamService.getSummary });
}

export function useTeamMemberProgress() {
  return useQuery({ queryKey: ['team', 'members'], queryFn: teamService.getMemberProgress });
}

export function useTeamSkillGaps() {
  return useQuery({ queryKey: ['team', 'skill-gaps'], queryFn: teamService.getSkillGaps });
}

export function useTeamLeaderboard() {
  return useQuery({ queryKey: ['team', 'leaderboard'], queryFn: teamService.getLeaderboard });
}
