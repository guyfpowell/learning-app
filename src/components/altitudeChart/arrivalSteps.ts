import {
  landmarkByKey,
  levelOf,
  nextLandmarkOf,
  nextLevelOf,
  type AchievementsResponse,
  type AltitudeResponse,
  type RewardUnlock,
} from '@learning/shared';
import { MEDAL_SIZE } from '@/components/celebrations/LandmarkUnlock';
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

/** How long each step of the arrival takes, and the rests between them (ms): fall in, float up (growing slowly), pause on the card, pulse out, sink straight into the hole, the landmark's badge grows out of the hole until it covers the screen, the card shows behind it, then the badge falls onto its place on the card (`land`, then a spring bounce). */
export const ARRIVAL_MS = { fall: 1500, float: 2400, pause: 500, pulse: 450, sink: 600, grow: 700, cover: 150, land: 600 } as const;

/** How big the bubble starts (as if far above the screen), how small it sinks to (a hole), how much bigger than the Next card it grows, and how far it swells in its one pulse out, how many screens big the badge grows to cover it, and how small the landing presses it. */
export const ARRIVAL_SCALE = { start: 14, hole: 0.02, oversize: 1.08, pulse: 1.08, screens: 1.25, landing: 0.9 } as const;

/** The spring the badge lands on: it presses down to `landing` of its size, then springs back up past full size and settles. */
export const ARRIVAL_SPRING = { damping: 7, stiffness: 140, mass: 1 } as const;

/** How big, as a multiple of its own size, the badge must be to measure `ARRIVAL_SCALE.screens` times the screen's longer side. */
export function badgeFullScale(windowWidth: number, windowHeight: number): number {
  return (ARRIVAL_SCALE.screens * Math.max(windowWidth, windowHeight)) / MEDAL_SIZE;
}

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
