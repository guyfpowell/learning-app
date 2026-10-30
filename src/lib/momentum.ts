import { DAY_MS, type AchievementsResponse, type XpProgress } from '@learning/shared';
import { phraseAt } from '@/lib/quizFeedbackPhrase';

/** An achievement unlocked this recently is celebrated on Home. */
export const NEW_ACHIEVEMENT_DAYS = 3;

export type AchievementLine =
  | { kind: 'new'; name: string }
  | { kind: 'next'; name: string; description: string };

/**
 * The one achievement line Home shows: the newest unlock if it is recent, else the next locked one.
 * The XP ladder is left out, because the XP bar already shows it. The API sends no progress toward a
 * locked achievement, so "next" is the first one in the API's order, not the closest.
 */
export function achievementLineOf(achievements: AchievementsResponse, now: number): AchievementLine | null {
  const newest = achievements.unlocked.reduce<AchievementsResponse['unlocked'][number] | null>(
    (best, a) => (best === null || Date.parse(a.unlockedAt) > Date.parse(best.unlockedAt) ? a : best),
    null,
  );
  if (newest && now - Date.parse(newest.unlockedAt) <= NEW_ACHIEVEMENT_DAYS * DAY_MS) {
    return { kind: 'new', name: newest.name };
  }
  const next = achievements.locked.find((a) => a.ladder !== 'xp');
  return next ? { kind: 'next', name: next.name, description: next.description } : null;
}

export interface XpLine {
  title: string;
  caption: string;
  percent: number;
}

/** The XP bar's words and fill, from the shared progress. */
export function xpLineOf(progress: XpProgress): XpLine {
  switch (progress.kind) {
    case 'tier':      return { title: progress.label, caption: `${progress.xpToNext} XP to the next level`, percent: progress.percent };
    case 'milestone': return { title: progress.name, caption: `${progress.xpRemaining} XP to go`, percent: progress.percent };
    case 'done':      return { title: 'Every milestone reached', caption: '', percent: 100 };
  }
}

export type StreakStage = 'start' | 'early' | 'building' | 'steady' | 'long';

/** Which stage of a streak this many days is. */
export function streakStageOf(streak: number): StreakStage {
  if (streak <= 0) return 'start';
  if (streak <= 2) return 'early';
  if (streak <= 6) return 'building';
  if (streak <= 29) return 'steady';
  return 'long';
}

/**
 * The line beside the streak calendar, several per stage so it changes. None repeats the count (the
 * calendar shows it), and each is short enough for one line beside the calendar on most phones.
 */
export const STREAK_COPY: Record<StreakStage, readonly string[]> = {
  start: ['Complete a lesson to start your streak'],
  early: [
    'Every day adds up.',
    'A strong start. Keep going.',
    'Small steps, real progress.',
    "You've started. Keep it going.",
    'One day at a time.',
    'Momentum starts here.',
    'Good start. Keep showing up.',
    'The first days matter most.',
  ],
  building: [
    'Consistency is building.',
    "You're finding your rhythm.",
    'Steady wins.',
    'Keep the momentum going.',
    'Showing up is the hard part.',
    'A real routine is forming.',
    'Day by day, it adds up.',
    "You're on a roll.",
  ],
  steady: [
    'Steady progress, week on week.',
    "That's real consistency.",
    'Learning is becoming routine.',
    'Your future self will thank you.',
    'Keep that rhythm going.',
    'Consistency compounds.',
    'This is how skills are built.',
    'Strong run. Keep it up.',
  ],
  long: [
    'This is how expertise is built.',
    "That's serious consistency.",
    'Expertise is built like this.',
    'Few people keep this up.',
    'Learning is part of your routine.',
    'Remarkable consistency.',
    'Real commitment to your craft.',
    'Months of steady learning.',
  ],
};

// How many lines of each stage have been shown this session, from a random start so a new launch
// does not always open on the same line.
const shown: Record<StreakStage, number> = { start: 0, early: 0, building: 0, steady: 0, long: 0 };

function randomStarts(): Record<StreakStage, number> {
  return {
    start: 0,
    early: Math.floor(Math.random() * STREAK_COPY.early.length),
    building: Math.floor(Math.random() * STREAK_COPY.building.length),
    steady: Math.floor(Math.random() * STREAK_COPY.steady.length),
    long: Math.floor(Math.random() * STREAK_COPY.long.length),
  };
}

Object.assign(shown, randomStarts());

/** The next line for a stage: in order, then odd then even places, then backwards, like the quiz headings. */
export function nextStreakCopy(stage: StreakStage): string {
  const line = phraseAt(STREAK_COPY[stage], shown[stage]);
  shown[stage] += 1;
  return line;
}

/** For tests: set where each stage's rotation starts. */
export function resetStreakCopy(starts: Partial<Record<StreakStage, number>> = {}): void {
  Object.assign(shown, { start: 0, early: 0, building: 0, steady: 0, long: 0 }, starts);
}
