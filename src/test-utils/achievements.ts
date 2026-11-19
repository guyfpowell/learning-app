import { ACHIEVEMENTS_BY_KEY, type AchievementKey, type Celebration, type RewardUnlock, type Rewards } from '@learning/shared';

/** What a test may set on a fixture unlock: the size the server chose, and a Trailhead step's count. */
interface UnlockOverrides {
  celebration?: Celebration;
  stepsDone?: number;
}

/** A complete unlock as the server sends it, built from the catalogue entry for `key`. Full screen unless a test says otherwise. */
export function makeRewardUnlock(key: AchievementKey, { celebration = 'full', stepsDone = 1 }: UnlockOverrides = {}): RewardUnlock {
  const { kind, tier, name, description } = ACHIEVEMENTS_BY_KEY[key];
  const base = { key, tier, name, description, celebration };
  return kind === 'trailhead-step' ? { ...base, kind, stepsDone } : { ...base, kind };
}

/** A complete `Rewards` payload: nothing earned unless `overrides` say so. */
export function makeRewards(overrides: Partial<Rewards> = {}): Rewards {
  return { unlocked: [], landmarksPassed: [], levelUp: null, metresClimbed: 0, boost: false, ...overrides };
}
