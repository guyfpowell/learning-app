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
    expect(line).toEqual({ kind: 'new', key: 'b', name: 'Fresh' });
  });

  it('counts an unlock exactly at the window edge as new', () => {
    const line = achievementLineOf(response([unlocked('a', 'Edge', NEW_ACHIEVEMENT_DAYS)], []), NOW);
    expect(line).toEqual({ kind: 'new', key: 'a', name: 'Edge' });
  });

  it('falls back to the next locked achievement when nothing is new', () => {
    const line = achievementLineOf(response([unlocked('a', 'Old One', 9)], [locked('c', 'Warm Up')]), NOW);
    expect(line).toEqual({ kind: 'next', key: 'c', name: 'Warm Up' });
  });

  it('skips the XP ladder, which the XP bar already shows', () => {
    const line = achievementLineOf(response([], [locked('x', 'Foothills', 'xp'), locked('c', 'Warm Up')]), NOW);
    expect(line).toEqual({ kind: 'next', key: 'c', name: 'Warm Up' });
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
  ] as const)('puts a streak of %i in the %s stage', (streak, stage) => {
    expect(streakStageOf(streak)).toBe(stage);
  });
});

describe('STREAK_COPY', () => {
  const stages = Object.keys(STREAK_COPY) as StreakStage[];

  it('never repeats a number or mentions a habit, "today" or lessons, except the zero-streak line', () => {
    stages.filter(stage => stage !== 'start').forEach(stage => {
      STREAK_COPY[stage].forEach(line => {
        expect(line).not.toMatch(/\d|habit|today|lesson/i);
      });
    });
  });

  it('keeps every line but the zero-streak one short enough for one line', () => {
    stages.filter(stage => stage !== 'start').forEach(stage => {
      STREAK_COPY[stage].forEach(line => expect(line.length).toBeLessThanOrEqual(34));
    });
  });

  it('asks a new user to complete a lesson, with no "today"', () => {
    expect(STREAK_COPY.start).toEqual(['Complete a lesson to start your streak']);
  });
});

describe('nextStreakCopy', () => {
  beforeEach(() => resetStreakCopy());

  it('walks a stage in order on the first pass', () => {
    const shown = STREAK_COPY.building.map(() => nextStreakCopy('building'));
    expect(shown).toEqual([...STREAK_COPY.building]);
  });

  it('keeps each stage on its own place', () => {
    nextStreakCopy('early');
    expect(nextStreakCopy('building')).toBe(STREAK_COPY.building[0]);
  });

  it('gives the single start line every time', () => {
    expect(nextStreakCopy('start')).toBe('Complete a lesson to start your streak');
    expect(nextStreakCopy('start')).toBe('Complete a lesson to start your streak');
  });
});
