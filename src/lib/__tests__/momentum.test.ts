import {
  STREAK_COPY,
  nextStreakCopy,
  resetStreakCopy,
  streakStageOf,
  type StreakStage,
} from '../momentum';

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

  it('never repeats a number or mentions a habit or "today", except the zero-streak line', () => {
    stages.filter(stage => stage !== 'start').forEach(stage => {
      STREAK_COPY[stage].forEach(line => {
        expect(line).not.toMatch(/\d|habit|today/i);
      });
    });
  });

  it('keeps every line but the zero-streak one short enough for one line', () => {
    stages.filter(stage => stage !== 'start').forEach(stage => {
      STREAK_COPY[stage].forEach(line => expect(line.length).toBeLessThanOrEqual(34));
    });
  });

  it('says "Every lesson adds up." in the early stage, not "Every day"', () => {
    expect(STREAK_COPY.early).toContain('Every lesson adds up.');
    expect(STREAK_COPY.early).not.toContain('Every day adds up.');
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
