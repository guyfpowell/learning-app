import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import AlbertScreen from '../albert';
import { useSkills } from '@/hooks/useTrack';
import type { SkillWithAccess } from '@learning/shared';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

jest.mock('@/hooks/useTrack', () => ({ useSkills: jest.fn() }));

let capturedEdges: string[] | undefined;
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, edges }: { children: React.ReactNode; edges?: string[] }) => {
    capturedEdges = edges;
    return <>{children}</>;
  },
}));

const freeSkill = {
  id: 'skill-1',
  premiumStatus: 'free',
  userHasAccess: true,
} as unknown as SkillWithAccess;

const premiumLocked = {
  id: 'skill-2',
  premiumStatus: 'premium',
  userHasAccess: false,
} as unknown as SkillWithAccess;

const premiumOpen = { ...premiumLocked, userHasAccess: true } as SkillWithAccess;

function setSkills(skills: SkillWithAccess[] | undefined, isLoading = false) {
  (useSkills as jest.Mock).mockReturnValue({ data: skills, isLoading });
}

describe('AlbertScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedEdges = undefined;
    setSkills([freeSkill, premiumLocked]);
  });

  it('shows the Meet Albert heading and intro copy', () => {
    render(<AlbertScreen />);
    expect(screen.getByText('Meet Albert')).toBeTruthy();
    expect(screen.getByTestId('albert-intro')).toBeTruthy();
  });

  it('offers Start to a user with access to a premium track', () => {
    setSkills([freeSkill, premiumOpen]);
    render(<AlbertScreen />);
    expect(screen.getByTestId('build-path-start')).toBeTruthy();
    expect(screen.queryByTestId('build-path-upgrade')).toBeNull();
  });

  it('routes a premium user to the builder', () => {
    setSkills([freeSkill, premiumOpen]);
    render(<AlbertScreen />);
    fireEvent.press(screen.getByTestId('build-path-start'));
    expect(mockPush).toHaveBeenCalledWith('/build');
  });

  it('offers an upgrade to a free user instead of hiding the card', () => {
    render(<AlbertScreen />);
    expect(screen.getByTestId('build-path-card')).toBeTruthy();
    expect(screen.getByTestId('build-path-upgrade')).toBeTruthy();
    expect(screen.queryByTestId('build-path-start')).toBeNull();
  });

  it('never routes a free user into the builder; opens the upgrade modal', () => {
    render(<AlbertScreen />);
    fireEvent.press(screen.getByTestId('build-path-upgrade'));
    expect(mockPush).not.toHaveBeenCalledWith('/build');
    expect(screen.getByTestId('premium-modal')).toBeTruthy();
  });

  it('Upgrade now in the modal goes to Profile, not the deleted Settings route', () => {
    render(<AlbertScreen />);
    fireEvent.press(screen.getByTestId('build-path-upgrade'));
    fireEvent.press(screen.getByTestId('upgrade-now-btn'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/profile');
  });

  it('does not crash while skills are still loading', () => {
    setSkills(undefined, true);
    expect(() => render(<AlbertScreen />)).not.toThrow();
  });

  it('uses edges=[left,right,bottom] so the tab layout owns the top inset', () => {
    render(<AlbertScreen />);
    expect(capturedEdges).toEqual(['left', 'right', 'bottom']);
  });
});
