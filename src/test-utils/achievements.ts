import {
  ACHIEVEMENTS_BY_KEY,
  listedLandmarks,
  type AchievementAxis,
  type AchievementsResponse,
  type AchievementKey,
  type Celebration,
  type DatedRewardUnlock,
  type Ladder,
  type Landmark,
  type LandmarkPassed,
  type RewardUnlock,
  type Rewards,
  type Rung,
  type Trailhead,
  type WeekSummaryResponse,
  TRAILHEAD_STEP_KEYS,
} from '@learning/shared';

/** A complete rung as the server sends it, built from the catalogue entry for `key`: locked, not next, no progress, unless `overrides` say so. A locked secret has an empty name and description and its hint, as the server sends it. */
export function makeRung(key: AchievementKey, overrides: Partial<Rung> = {}): Rung {
  const { tier, name, description, secret } = ACHIEVEMENTS_BY_KEY[key];
  const unlockedAt = overrides.unlockedAt ?? null;
  const hiddenSecret = secret !== null && unlockedAt === null;
  return {
    key,
    tier,
    name: hiddenSecret ? '' : name,
    description: hiddenSecret ? '' : description,
    unlockedAt,
    progress: null,
    isNextRung: false,
    hint: hiddenSecret ? secret.hint : null,
    ...overrides,
  };
}

/** A ladder of rungs, in the order given. */
export function makeLadder(category: AchievementAxis, rungs: Rung[]): Ladder {
  return { category, rungs };
}

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

/** The Trailhead as the server sends it: the first `done` steps done, in order, and `finished` as given (it is the medal's, never inferred from the count). */
export function makeTrailhead(done: number, finished = false): Trailhead {
  const steps = TRAILHEAD_STEP_KEYS.map((key, i) => ({ key, name: ACHIEVEMENTS_BY_KEY[key].name, done: i < done }));
  return { steps, finished };
}

/** When a fixture landmark was passed. */
const LANDMARK_PASSED_AT = '2026-11-04T12:00:00Z';

/** The landmark list as the server sends it for a learner at `metres`: every listed landmark in height order, passed (with a date) or ahead (null). Orbit is listed only past the Kármán line. */
export function makeLandmarks(metres: number): LandmarkPassed[] {
  const isPassed = ({ height }: Landmark) => height <= metres;
  return listedLandmarks(isPassed).map((landmark) => ({ key: landmark.key, passedAt: isPassed(landmark) ? LANDMARK_PASSED_AT : null }));
}

/** A complete `AchievementsResponse` for a learner at `metres`: no medals, the Trailhead finished, every landmark in the list. */
export function makeAchievementsResponse(metres: number, overrides: Partial<AchievementsResponse> = {}): AchievementsResponse {
  return { ladders: [], trailhead: makeTrailhead(0, true), totalUnlocked: 0, totalAvailable: 0, landmarks: makeLandmarks(metres), ...overrides };
}

/** An unlock with the instant it happened, as the week and `/unseen` send it. */
export function makeDatedUnlock(key: AchievementKey, unlockedAt: string, overrides: UnlockOverrides = {}): DatedRewardUnlock {
  return { ...makeRewardUnlock(key, overrides), unlockedAt };
}

/** A complete `WeekSummaryResponse`: a quiet week unless `overrides` say so. */
export function makeWeekSummary(overrides: Partial<WeekSummaryResponse> = {}): WeekSummaryResponse {
  return { metresClimbed: 0, levelAtStart: 1, levelNow: 1, lessonsCompleted: 0, metresNow: 0, unlocked: [], ...overrides };
}
