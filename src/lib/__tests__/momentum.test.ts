import { DAY_MS, type AchievementDefinition, type AchievementsResponse, type UserAchievement } from '@learning/shared';
import {
  NEW_ACHIEVEMENT_DAYS,
  STREAK_COPY,
  achievementLineOf,
  nextStreakCopy,
  resetStreakCopy,
  streakStageOf,
  xpLineOf,
  type StreakStage,
} from '../momentum';

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

describe('streakStageOf', () => {
  it.each([
    [0, 'start'], [1, 'early'], [2, 'early'], [3, 'building'], [6, 'building'],
    [7, 'steady'], [29, 'steady'], [30, 'long'], [400, 'long'],
  ] as const)('a %i-day streak is the %s stage', (streak, stage) => {
    expect(streakStageOf(streak)).toBe(stage);
  });
});

describe('STREAK_COPY', () => {
  const later: StreakStage[] = ['early', 'building', 'steady', 'long'];

  it.each(later)('has a good few lines for the %s stage, so it can change', (stage) => {
    expect(STREAK_COPY[stage].length).toBeGreaterThanOrEqual(8);
  });

  it.each(later)('keeps every %s line short enough for one line beside the calendar', (stage) => {
    for (const line of STREAK_COPY[stage]) expect(line.length).toBeLessThanOrEqual(34);
  });

  it.each(later)('talks about days, not lessons or a habit, and never repeats the count (%s)', (stage) => {
    for (const line of STREAK_COPY[stage]) {
      expect(line).not.toMatch(/lesson|today|habit|\d/i);
    }
  });

  it('asks a new user to complete a lesson, with no "today"', () => {
    expect(STREAK_COPY.start).toEqual(['Complete a lesson to start your streak']);
  });
});

describe('nextStreakCopy', () => {
  beforeEach(() => resetStreakCopy());

  it('walks a stage in order first, then odd places then even places, then backwards', () => {
    const lines = STREAK_COPY.building;
    const take = (n: number) => Array.from({ length: n }, () => nextStreakCopy('building'));
    expect(take(lines.length)).toEqual([...lines]);
    const second = take(lines.length);
    expect(second.slice(0, 4)).toEqual([lines[0], lines[2], lines[4], lines[6]]);
    expect(take(lines.length)).toEqual([...lines].reverse());
  });

  it('keeps each stage on its own place', () => {
    nextStreakCopy('building');
    nextStreakCopy('building');
    expect(nextStreakCopy('early')).toBe(STREAK_COPY.early[0]);
  });

  it('can start part-way through a stage', () => {
    resetStreakCopy({ steady: 3 });
    expect(nextStreakCopy('steady')).toBe(STREAK_COPY.steady[3]);
  });

  it('gives the single start line every time', () => {
    expect([nextStreakCopy('start'), nextStreakCopy('start')]).toEqual([
      'Complete a lesson to start your streak',
      'Complete a lesson to start your streak',
    ]);
  });
});
