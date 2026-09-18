import React from 'react';
import { render, screen } from '@testing-library/react-native';
import TeamScreen from '../team';
import {
  useTeamSummary,
  useTeamMemberProgress,
  useTeamSkillGaps,
  useTeamLeaderboard,
} from '@/hooks/useTeam';

// TEAM_FEATURE_ENABLED is false by default — no mock needed
jest.mock('@/hooks/useTeam', () => ({
  useTeamSummary:        jest.fn(),
  useTeamMemberProgress: jest.fn(),
  useTeamSkillGaps:      jest.fn(),
  useTeamLeaderboard:    jest.fn(),
}));

let capturedEdges: string[] | undefined;
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, edges }: { children: React.ReactNode; edges?: string[] }) => {
    capturedEdges = edges;
    return <>{children}</>;
  },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync:    jest.fn(() => Promise.resolve(null)),
  setItemAsync:    jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

beforeEach(() => {
  capturedEdges = undefined;
  (useTeamSummary as jest.Mock).mockReturnValue({ data: undefined, isLoading: false, error: null });
  (useTeamMemberProgress as jest.Mock).mockReturnValue({ data: undefined, isLoading: false, error: null });
  (useTeamSkillGaps as jest.Mock).mockReturnValue({ data: undefined, isLoading: false, error: null });
  (useTeamLeaderboard as jest.Mock).mockReturnValue({ data: undefined, isLoading: false, error: null });
});

describe('TeamScreen — coming soon state (feature disabled)', () => {
  it('shows the coming soon heading', () => {
    render(<TeamScreen />);
    expect(screen.getByTestId('team-coming-soon')).toBeTruthy();
  });

  it('shows an explanatory message that team features are on the way', () => {
    render(<TeamScreen />);
    expect(screen.getByTestId('team-coming-soon-body')).toBeTruthy();
  });

  it('does not show raw server error text', () => {
    (useTeamSummary as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Internal Server Error'),
    });
    render(<TeamScreen />);
    expect(screen.queryByTestId('team-error')).toBeNull();
    expect(screen.queryByText('Internal Server Error')).toBeNull();
  });

  it('does not render the Team Dashboard content', () => {
    render(<TeamScreen />);
    expect(screen.queryByText('Team Dashboard')).toBeNull();
  });

  it('does not render a retry button', () => {
    render(<TeamScreen />);
    expect(screen.queryByText(/retry/i)).toBeNull();
    expect(screen.queryByText(/try again/i)).toBeNull();
  });

  it('uses edges=[left,right,bottom] so the tab layout owns the top inset (Ticket 072j)', () => {
    render(<TeamScreen />);
    expect(capturedEdges).toEqual(['left', 'right', 'bottom']);
  });
});
