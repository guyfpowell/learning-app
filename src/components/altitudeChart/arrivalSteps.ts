import {
  landmarkByKey,
  levelOf,
  nextLandmarkOf,
  nextLevelOf,
  type AchievementsResponse,
  type AltitudeResponse,
  type RewardUnlock,
} from '@learning/shared';
import { NEXT_CARD_LEFT, NEXT_CARD_RIGHT } from './NextLandmarkCard';
import { PILL_LEFT } from './YouMarker';

/** What the Next card says is left to climb while the bubble covers it: one lesson (the learner has just earned the landmark, so the real figure is already gone). */
const LESSONS_TO_GO = 1;

/**
 * The landmark arrival (ticket 114): the learner's bubble drops in at the previous landmark, floats up to the one just earned, then bursts into its card.
 * Everything it needs to draw: the unlock, the metres the count runs between, and the chart as it was before the landmark was passed.
 */
export interface ArrivalPlan {
  unlock: RewardUnlock;
  /** The previous highest landmark's height, or 0 (sea level) when there was none. */
  fromMetres: number;
  /** The earned landmark's height. */
  toMetres: number;
  /** The Altitude screen's data as it was before: the learner at `fromMetres`, the earned landmark not yet passed. */
  before: { altitude: AltitudeResponse; achievements: AchievementsResponse };
}

/** How long each step of the arrival takes, and the rests between them (ms): fall in, rest, float up (growing slowly), pause on the card, pulse out, sink straight into the hole, explode out, then the landmark card fades in. */
export const ARRIVAL_MS = { fall: 1500, rest: 300, float: 2400, pause: 500, pulse: 450, sink: 600, burst: 1200 } as const;

/** How big the bubble starts (as if far above the screen), how small it sinks to (a hole), how much bigger than the Next card it grows, and how far it swells in its one pulse out. */
export const ARRIVAL_SCALE = { start: 14, hole: 0.02, oversize: 1.08, pulse: 1.08 } as const;

/** How the burst's 0 to 1 is shared: the white explosion grows out of the hole until `exploded`; the card starts uncovering and fading in at `cardFrom`, fully in a quarter of the burst later. */
export const ARRIVAL_BURST = { exploded: 0.5, cardFrom: 0.4, cardFadeLength: 0.25 } as const;

/** What the bubble does to cover the Next card: grow by `scale` and move `shiftX` sideways, so it is centred on the card and a little wider. */
export function coverOfNextCard(pillWidth: number, windowWidth: number): { scale: number; shiftX: number } {
  if (pillWidth <= 0) return { scale: 1, shiftX: 0 };
  const cardWidth = windowWidth - NEXT_CARD_LEFT - NEXT_CARD_RIGHT;
  const pillCentre = PILL_LEFT + pillWidth / 2;
  return { scale: (cardWidth / pillWidth) * ARRIVAL_SCALE.oversize, shiftX: NEXT_CARD_LEFT + cardWidth / 2 - pillCentre };
}

/** The altitude response for a learner at `metres`, as `GET /users/altitude` would send it. */
function arrivalAltitudeOf(metres: number): AltitudeResponse {
  const next = nextLandmarkOf(metres);
  return {
    metres,
    level: levelOf(metres),
    nextLevel: nextLevelOf(metres),
    lessonsToNextLevel: null,
    nextLandmark: next === null ? null : { ...next, lessonsToGo: LESSONS_TO_GO },
    newLandmark: null,
  };
}

/**
 * The arrival for a landmark unlock, from the learner's achievements as the server now sends them (the landmark already passed).
 * The bubble starts at the highest landmark passed below this one (sea level when none), and the chart is drawn with this
 * landmark and everything above it ahead. Null when the unlock is not a landmark.
 */
export function arrivalPlanOf(unlock: RewardUnlock, achievements: AchievementsResponse): ArrivalPlan | null {
  const landmark = landmarkByKey(unlock.key);
  if (landmark === null) return null;
  const heightOf = (key: string) => landmarkByKey(key)?.height ?? 0;
  const passedBelow = achievements.landmarks.filter((l) => l.passedAt !== null && heightOf(l.key) < landmark.height);
  const fromMetres = Math.max(0, ...passedBelow.map((l) => heightOf(l.key)));
  const ahead = { ...achievements, landmarks: achievements.landmarks.map((l) => (heightOf(l.key) >= landmark.height ? { ...l, passedAt: null } : l)) };
  return { unlock, fromMetres, toMetres: landmark.height, before: { altitude: arrivalAltitudeOf(fromMetres), achievements: ahead } };
}

/** The metres the bubble shows `progress` (0 to 1) of the way through its float: counting up from the previous landmark's height to the earned one's. */
export function countedMetresOf({ fromMetres, toMetres }: Pick<ArrivalPlan, 'fromMetres' | 'toMetres'>, progress: number): number {
  return Math.round(fromMetres + (toMetres - fromMetres) * progress);
}
