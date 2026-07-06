import React from 'react';
import { render, screen } from '@testing-library/react-native';
import TeamScreen from '../team';
import {
  useTeamSummary,
  useTeamMemberProgress,
  useTeamSkillGaps,
  useTeamLeaderboard,
} from '@/hooks/useTeam';
import type { TeamSummary, MemberProgress, SkillGap, LeaderboardEntry } from '@learning/shared';

jest.mock('@/hooks/useTeam', () => ({
  useTeamSummary:        jest.fn(),
  useTeamMemberProgress: jest.fn(),
  useTeamSkillGaps:      jest.fn(),
  useTeamLeaderboard:    jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync:    jest.fn(() => Promise.resolve(null)),
  setItemAsync:    jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

const mockSummary: TeamSummary = {
  memberCount:      5,
  totalCompletions: 42,
  avgQuizScore:     78,
  avgStreak:        4,
};

const mockMembers: MemberProgress[] = [
  {
    userId:           'u-1',
    name:             'Alice Johnson',
    email:            'alice@example.com',
    lessonsCompleted: 10,
    avgScore:         82,
    streak:           7,
    lastActive:       '2026-07-05T00:00:00Z',
    currentSkill:     'Product Strategy',
  },
  {
    userId:           'u-2',
    name:             'Bob Smith',
    email:            'bob@example.com',
    lessonsCompleted: 3,
    avgScore:         55,
    streak:           0,
    lastActive:       null,
    currentSkill:     null,
  },
];

const mockSkillGaps: SkillGap[] = [
  { skillName: 'Data Analysis', avgScore: 45, sampleSize: 8 },
  { skillName: 'Product Strategy', avgScore: 82, sampleSize: 12 },
];

const mockLeaderboard: LeaderboardEntry[] = [
  { userId: 'u-1', name: 'Alice Johnson', streak: 7, lessonsCompleted: 10 },
  { userId: 'u-2', name: 'Bob Smith',    streak: 0, lessonsCompleted: 3 },
];

function seedDefaults() {
  (useTeamSummary as jest.Mock).mockReturnValue({ data: mockSummary, isLoading: false, error: null });
  (useTeamMemberProgress as jest.Mock).mockReturnValue({ data: mockMembers, isLoading: false, error: null });
  (useTeamSkillGaps as jest.Mock).mockReturnValue({ data: mockSkillGaps, isLoading: false, error: null });
  (useTeamLeaderboard as jest.Mock).mockReturnValue({ data: mockLeaderboard, isLoading: false, error: null });
}

beforeEach(() => {
  seedDefaults();
});

describe('TeamScreen', () => {
  it('renders the Team Dashboard heading', () => {
    render(<TeamScreen />);
    expect(screen.getByText('Team Dashboard')).toBeTruthy();
  });

  describe('loading state', () => {
    it('shows spinner when any query is loading', () => {
      (useTeamSummary as jest.Mock).mockReturnValue({ data: undefined, isLoading: true, error: null });
      render(<TeamScreen />);
      expect(screen.getByTestId('loading-spinner')).toBeTruthy();
    });
  });

  describe('error state', () => {
    it('shows error message when a query fails', () => {
      (useTeamSummary as jest.Mock).mockReturnValue({ data: undefined, isLoading: false, error: new Error('Network error') });
      render(<TeamScreen />);
      expect(screen.getByText(/Failed to load team data/i)).toBeTruthy();
    });
  });

  describe('summary stat cards', () => {
    it('renders member count', () => {
      render(<TeamScreen />);
      expect(screen.getByText('5')).toBeTruthy();
      expect(screen.getByText('Members')).toBeTruthy();
    });

    it('renders total completions', () => {
      render(<TeamScreen />);
      expect(screen.getByText('42')).toBeTruthy();
      expect(screen.getByText('Total Completions')).toBeTruthy();
    });

    it('renders avg quiz score as percentage', () => {
      render(<TeamScreen />);
      expect(screen.getByText('78%')).toBeTruthy();
      expect(screen.getByText('Avg Quiz Score')).toBeTruthy();
    });

    it('renders avg streak with days label', () => {
      render(<TeamScreen />);
      expect(screen.getByText('4d')).toBeTruthy();
      expect(screen.getByText('Avg Streak')).toBeTruthy();
    });
  });

  describe('member progress', () => {
    it('renders member names', () => {
      render(<TeamScreen />);
      expect(screen.getAllByText('Alice Johnson').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Bob Smith').length).toBeGreaterThanOrEqual(1);
    });

    it('renders current skill when present', () => {
      render(<TeamScreen />);
      expect(screen.getAllByText('Product Strategy').length).toBeGreaterThanOrEqual(1);
    });

    it('renders streak for member', () => {
      render(<TeamScreen />);
      expect(screen.getByText('🔥 7')).toBeTruthy();
    });

    it('renders lessons completed count', () => {
      render(<TeamScreen />);
      expect(screen.getByText('10 lessons')).toBeTruthy();
    });

    it('renders avg score for member', () => {
      render(<TeamScreen />);
      expect(screen.getAllByText('82%').length).toBeGreaterThanOrEqual(1);
    });

    it('shows empty state when no members', () => {
      (useTeamMemberProgress as jest.Mock).mockReturnValue({ data: [], isLoading: false, error: null });
      render(<TeamScreen />);
      expect(screen.getByText('No member progress yet.')).toBeTruthy();
    });
  });

  describe('leaderboard', () => {
    it('renders leaderboard heading', () => {
      render(<TeamScreen />);
      expect(screen.getByText('Leaderboard')).toBeTruthy();
    });

    it('renders leaderboard entry names', () => {
      render(<TeamScreen />);
      // Both appear in member progress and leaderboard
      expect(screen.getAllByText('Alice Johnson').length).toBeGreaterThanOrEqual(1);
    });

    it('shows empty state when no leaderboard entries', () => {
      (useTeamLeaderboard as jest.Mock).mockReturnValue({ data: [], isLoading: false, error: null });
      render(<TeamScreen />);
      expect(screen.getByText('No leaderboard data yet.')).toBeTruthy();
    });
  });

  describe('skill gaps', () => {
    it('renders skill gaps heading', () => {
      render(<TeamScreen />);
      expect(screen.getByText('Skill Gaps')).toBeTruthy();
    });

    it('renders skill names', () => {
      render(<TeamScreen />);
      expect(screen.getByText('Data Analysis')).toBeTruthy();
    });

    it('renders skill avg score', () => {
      render(<TeamScreen />);
      expect(screen.getByText('45%')).toBeTruthy();
    });

    it('shows empty state when no skill gaps', () => {
      (useTeamSkillGaps as jest.Mock).mockReturnValue({ data: [], isLoading: false, error: null });
      render(<TeamScreen />);
      expect(screen.getByText('No skill gap data yet.')).toBeTruthy();
    });
  });
});
