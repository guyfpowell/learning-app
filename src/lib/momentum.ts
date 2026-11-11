import { DAY_MS, type AchievementsResponse, type XpProgress } from '@learning/shared';

/** An achievement unlocked this recently is celebrated on Home. */
export const NEW_ACHIEVEMENT_DAYS = 3;

export interface AchievementLine {
  kind: 'new' | 'next';
  /** The achievement's key, for its medal. */
  key: string;
  name: string;
}

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
    return { kind: 'new', key: newest.key, name: newest.name };
  }
  const next = achievements.locked.find((a) => a.ladder !== 'xp');
  return next ? { kind: 'next', key: next.key, name: next.name } : null;
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
