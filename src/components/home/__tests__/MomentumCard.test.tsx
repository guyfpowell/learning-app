import React from 'react';
import { render, screen, within } from '@testing-library/react-native';
import { DAY_MS, type AchievementsResponse, type XpResponse } from '@learning/shared';
import { useXp } from '@/hooks/useXp';
import { useAchievements } from '@/hooks/useAchievements';
import { STREAK_COPY } from '@/lib/momentum';
import { MomentumCard } from '../MomentumCard';

jest.mock('@/hooks/useXp', () => ({ useXp: jest.fn() }));
jest.mock('@/hooks/useAchievements', () => ({ useAchievements: jest.fn() }));

const xp: XpResponse = {
  totalXp: 1170,
  nextMilestone: null,
  tier: { key: 'base-camp', name: 'Base Camp', level: 1, label: 'Base Camp I', floor: 1000, ceiling: 1600 },
};

const achievements = (unlockedDaysAgo: number | null): AchievementsResponse => ({
  unlocked: unlockedDaysAgo === null ? [] : [{
    key: 'clean-sheet', name: 'Clean Sheet', description: 'Got 10 quizzes right first time', axis: 'accuracy',
    unlockedAt: new Date(Date.now() - unlockedDaysAgo * DAY_MS).toISOString(),
  }],
  locked: [{ key: 'warm-up', name: 'Warm Up', description: 'Completed 3 lessons', axis: 'session', ladder: 'session-volume' }],
  totalUnlocked: unlockedDaysAgo === null ? 0 : 1,
  totalAvailable: 2,
});

function setData(x: XpResponse | undefined, a: AchievementsResponse | undefined) {
  (useXp as jest.Mock).mockReturnValue({ data: x });
  (useAchievements as jest.Mock).mockReturnValue({ data: a });
}

describe('MomentumCard', () => {
  it('shows the streak as a flame with its count, and one line for its stage', () => {
    setData(undefined, undefined);
    render(<MomentumCard streak={4} />);
    expect(within(screen.getByTestId('streak-chip')).getByText('4')).toBeTruthy();
    expect(screen.getByLabelText('4 day streak')).toBeTruthy();
    expect(STREAK_COPY.building.filter(line => screen.queryByText(line) !== null)).toHaveLength(1);
  });

  it('keeps the same line when the card re-renders, and changes stage with the streak', () => {
    setData(undefined, undefined);
    const { rerender } = render(<MomentumCard streak={4} />);
    const shown = STREAK_COPY.building.find(line => screen.queryByText(line) !== null);
    rerender(<MomentumCard streak={5} />);
    expect(screen.getByText(shown ?? '')).toBeTruthy();
    rerender(<MomentumCard streak={0} />);
    expect(screen.getByText('Complete a lesson to start your streak')).toBeTruthy();
  });

  it('shows the XP level, total and what is left, with a bar', () => {
    setData(xp, undefined);
    render(<MomentumCard streak={1} />);
    const row = within(screen.getByTestId('momentum-xp'));
    expect(row.getByText('Base Camp')).toBeTruthy();
    expect(row.queryByText('Base Camp I')).toBeNull();
    expect(row.getByText('430 XP to the next level')).toBeTruthy();
    expect(row.getByText(/1,170/)).toBeTruthy();
    expect(screen.getByTestId('momentum-xp-bar')).toBeTruthy();
  });

  it('shows the step in a level as the trail beside the name', () => {
    setData({ ...xp, tier: { key: 'base-camp', name: 'Base Camp', level: 3, label: 'Base Camp III', floor: 2200, ceiling: 2800 } }, undefined);
    render(<MomentumCard streak={1} />);
    expect(within(screen.getByTestId('momentum-xp')).getByLabelText('Level 3 of 5')).toBeTruthy();
  });

  it('shows no trail before the first level (under 150 XP): the next milestone only', () => {
    setData({ totalXp: 40, nextMilestone: { key: 'foothills', name: 'Foothills', xpRequired: 150, xpRemaining: 110 }, tier: null }, undefined);
    render(<MomentumCard streak={1} />);
    expect(screen.getByText('Foothills')).toBeTruthy();
    expect(screen.queryByLabelText(/^Level \d of 5$/)).toBeNull();
  });

  it('leaves the XP row out until XP has loaded', () => {
    setData(undefined, undefined);
    render(<MomentumCard streak={1} />);
    expect(screen.queryByTestId('momentum-xp')).toBeNull();
  });

  it('celebrates a recent unlock with its medal', () => {
    setData(xp, achievements(1));
    render(<MomentumCard streak={1} />);
    const line = within(screen.getByTestId('momentum-achievement'));
    expect(line.getByText('New: Clean Sheet')).toBeTruthy();
    expect(line.getByTestId('medal-clean-sheet')).toBeTruthy();
  });

  it('shows the next achievement when nothing is new: its name only, with its medal', () => {
    setData(xp, achievements(20));
    render(<MomentumCard streak={1} />);
    const line = within(screen.getByTestId('momentum-achievement'));
    expect(line.getByText('Next up: Warm Up')).toBeTruthy();
    expect(line.queryByText(/Completed 3 lessons/)).toBeNull();
    expect(line.getByTestId('medal-warm-up')).toBeTruthy();
  });

  it('leaves the achievement line out until achievements have loaded', () => {
    setData(xp, undefined);
    render(<MomentumCard streak={1} />);
    expect(screen.queryByTestId('momentum-achievement')).toBeNull();
  });
});
