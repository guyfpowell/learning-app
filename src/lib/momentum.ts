import { phraseAt } from '@/lib/quizFeedbackPhrase';

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
 * The line at the top of Home beside the streak, several per stage so it changes. None repeats the
 * count (the streak chip shows it), and each is short enough for one line on most phones.
 */
export const STREAK_COPY: Record<StreakStage, readonly string[]> = {
  start: ['Complete a lesson to start your streak'],
  early: [
    'Every lesson adds up.',
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
