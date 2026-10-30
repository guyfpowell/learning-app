import { DAY_MS, type AchievementsResponse, type XpProgress } from '@learning/shared';

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

/** The line under the streak flame: it nudges at every stage of a streak. */
export function streakCopy(streak: number): string {
  if (streak === 0) return 'Complete a lesson today to start your streak';
  if (streak <= 2) return "You're building a habit — keep going!";
  if (streak <= 6) return `You're on a ${streak}-day streak — don't break it!`;
  if (streak <= 29) return `Impressive — ${streak} days in a row!`;
  return `You're on fire — ${streak}-day streak!`;
}
