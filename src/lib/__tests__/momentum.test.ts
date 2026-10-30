import { DAY_MS, type AchievementDefinition, type AchievementsResponse, type UserAchievement } from '@learning/shared';
import { NEW_ACHIEVEMENT_DAYS, achievementLineOf, streakCopy, xpLineOf } from '../momentum';

const NOW = Date.parse('2026-10-30T12:00:00Z');

const unlocked = (key: string, name: string, daysAgo: number): UserAchievement => ({
  key: key as UserAchievement['key'],
  name,
  description: `${name} description`,
  axis: 'session',
  unlockedAt: new Date(NOW - daysAgo * DAY_MS).toISOString(),
});

const locked = (key: string, name: string, ladder?: AchievementDefinition['ladder']): AchievementDefinition => ({
  key: key as AchievementDefinition['key'],
  name,
  description: `${name} description`,
  axis: 'session',
  ladder,
});

const response = (u: UserAchievement[], l: AchievementDefinition[]): AchievementsResponse => ({
  unlocked: u, locked: l, totalUnlocked: u.length, totalAvailable: u.length + l.length,
});

describe('achievementLineOf', () => {
  it('celebrates the newest achievement unlocked inside the window', () => {
    const line = achievementLineOf(response([unlocked('a', 'Old One', 9), unlocked('b', 'Fresh', 1)], [locked('c', 'Next')]), NOW);
    expect(line).toEqual({ kind: 'new', name: 'Fresh' });
  });

  it('counts an unlock exactly at the window edge as new', () => {
    const line = achievementLineOf(response([unlocked('a', 'Edge', NEW_ACHIEVEMENT_DAYS)], []), NOW);
    expect(line).toEqual({ kind: 'new', name: 'Edge' });
  });

  it('falls back to the next locked achievement when nothing is new', () => {
    const line = achievementLineOf(response([unlocked('a', 'Old One', 9)], [locked('c', 'Warm Up')]), NOW);
    expect(line).toEqual({ kind: 'next', name: 'Warm Up', description: 'Warm Up description' });
  });

  it('skips the XP ladder, which the XP bar already shows', () => {
    const line = achievementLineOf(response([], [locked('x', 'Foothills', 'xp'), locked('c', 'Warm Up')]), NOW);
    expect(line).toEqual({ kind: 'next', name: 'Warm Up', description: 'Warm Up description' });
  });

  it('shows nothing when everything else is unlocked', () => {
    expect(achievementLineOf(response([unlocked('a', 'Old', 9)], [locked('x', 'Foothills', 'xp')]), NOW)).toBeNull();
  });
});

describe('xpLineOf', () => {
  it('names the sub-level and what is left to the next', () => {
    expect(xpLineOf({ kind: 'tier', label: 'Base Camp I', percent: 27, xpToNext: 430 }))
      .toEqual({ title: 'Base Camp I', caption: '430 XP to the next level', percent: 27 });
  });

  it('names the first milestone before any tier', () => {
    expect(xpLineOf({ kind: 'milestone', name: 'Foothills', percent: 40, xpRemaining: 90 }))
      .toEqual({ title: 'Foothills', caption: '90 XP to go', percent: 40 });
  });

  it('says so when every milestone is reached', () => {
    expect(xpLineOf({ kind: 'done' })).toEqual({ title: 'Every milestone reached', caption: '', percent: 100 });
  });
});

describe('streakCopy', () => {
  it.each([
    [0, 'Complete a lesson today to start your streak'],
    [2, "You're building a habit — keep going!"],
    [5, "You're on a 5-day streak — don't break it!"],
    [20, 'Impressive — 20 days in a row!'],
    [30, "You're on fire — 30-day streak!"],
  ])('a %i-day streak says: %s', (streak, copy) => {
    expect(streakCopy(streak)).toBe(copy);
  });
});
