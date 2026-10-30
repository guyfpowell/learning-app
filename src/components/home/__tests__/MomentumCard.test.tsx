import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen, within } from '@testing-library/react-native';
import { DAY_MS, type AchievementsResponse, type XpResponse } from '@learning/shared';
import { useXp } from '@/hooks/useXp';
import { useAchievements } from '@/hooks/useAchievements';
import { colors, font, fontSize } from '@/theme';
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
    key: 'first-light', name: 'First Light', description: 'Completed your first lesson', axis: 'milestone',
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
  it('shows one streak calendar with the count on it, with no label, and the copy', () => {
    setData(undefined, undefined);
    render(<MomentumCard streak={4} />);
    expect(within(screen.getByTestId('streak-calendar')).getByText('4')).toBeTruthy();
    expect(screen.getAllByTestId('streak-calendar')).toHaveLength(1);
    expect(screen.queryByText('Calendar')).toBeNull();
    expect(screen.queryByText(/^Day \d/)).toBeNull();
    expect(screen.getByText("You're on a 4-day streak — don't break it!")).toBeTruthy();
  });

  it('shows the zero-streak copy', () => {
    setData(undefined, undefined);
    render(<MomentumCard streak={0} />);
    expect(screen.getByText('Complete a lesson today to start your streak')).toBeTruthy();
  });

  it('shows the XP level, total and what is left, with a bar', () => {
    setData(xp, undefined);
    render(<MomentumCard streak={1} />);
    const row = within(screen.getByTestId('momentum-xp'));
    expect(row.getByText('Base Camp I')).toBeTruthy();
    expect(row.getByText('1,170 XP')).toBeTruthy();
    expect(row.getByText('430 XP to the next level')).toBeTruthy();
    expect(screen.getByTestId('momentum-xp-bar')).toBeTruthy();
  });

  it('leaves the XP row out until XP has loaded', () => {
    setData(undefined, undefined);
    render(<MomentumCard streak={1} />);
    expect(screen.queryByTestId('momentum-xp')).toBeNull();
  });

  it('celebrates a recent unlock', () => {
    setData(xp, achievements(1));
    render(<MomentumCard streak={1} />);
    const line = within(screen.getByTestId('momentum-achievement'));
    expect(line.getByText('New: First Light')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('momentum-achievement').props.style).backgroundColor).toBe(colors.xpSoft);
  });

  it('gives the achievement icon its full size, with negative margins so the row stays text-sized', () => {
    setData(xp, achievements(1));
    render(<MomentumCard streak={1} />);
    const slot = StyleSheet.flatten(screen.getByTestId('momentum-achievement-icon').props.style);
    expect(slot).toMatchObject({ width: fontSize.xl, height: fontSize.xl });
    expect(slot.marginVertical).toBe(-(fontSize.xl - fontSize.md) / 2);
  });

  it('shows the next achievement when nothing is new, without the highlight', () => {
    setData(xp, achievements(20));
    render(<MomentumCard streak={1} />);
    expect(within(screen.getByTestId('momentum-achievement')).getByText('Next up: Warm Up · Completed 3 lessons')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('momentum-achievement').props.style).backgroundColor).toBeUndefined();
  });

  it('leaves the achievement line out until achievements have loaded', () => {
    setData(xp, undefined);
    render(<MomentumCard streak={1} />);
    expect(screen.queryByTestId('momentum-achievement')).toBeNull();
  });
});
