import { landmarkOf, levelOf, type LandmarkKey } from '@learning/shared';
import { MEDAL_SIZE } from '@/components/celebrations/LandmarkUnlock';
import { ARRIVAL_SCALE, arrivalPlanOf, badgeFullScale, countedMetresOf, coverOfNextCard } from '../arrivalSteps';
import { makeAchievementsResponse, makeRewardUnlock } from '@/test-utils/achievements';
import { must } from '@/test-utils/must';
import { NEXT_CARD_LEFT, NEXT_CARD_RIGHT } from '../NextLandmarkCard';
import { PILL_LEFT } from '../YouMarker';
import { altitudeLayoutOf } from '../chartLayout';

const NOW = new Date('2026-11-24T12:00:00Z');

/** The server's achievements for a learner at `metres` with `extra` landmarks also marked passed (a gap, to tell "highest passed" from "the one before in the list"). */
function achievementsAt(metres: number, extra: LandmarkKey[] = []) {
  const base = makeAchievementsResponse(metres);
  return { ...base, landmarks: base.landmarks.map((l) => (extra.includes(l.key) ? { ...l, passedAt: '2026-11-04T12:00:00Z' } : l)) };
}

describe('arrivalPlanOf', () => {
  const scafell = makeRewardUnlock('scafell-pike');
  const scafellMetres = landmarkOf('scafell-pike').height;

  it('starts the bubble at the highest landmark passed below the earned one', () => {
    const plan = must(arrivalPlanOf(scafell, achievementsAt(scafellMetres)), 'plan');
    expect(plan.fromMetres).toBe(landmarkOf('kinder-scout').height);
    expect(plan.toMetres).toBe(scafellMetres);
    expect(plan.before.altitude.metres).toBe(plan.fromMetres);
    expect(plan.before.altitude.level).toBe(levelOf(plan.fromMetres));
  });

  it('starts at sea level when no landmark was passed before', () => {
    const plan = must(arrivalPlanOf(makeRewardUnlock('big-ben'), achievementsAt(landmarkOf('big-ben').height)), 'plan');
    expect(plan.fromMetres).toBe(0);
  });

  it('takes the highest passed landmark, not the one before it in the list, when one in between was never passed', () => {
    const base = achievementsAt(scafellMetres);
    const withoutKinder = { ...base, landmarks: base.landmarks.map((l) => (l.key === 'kinder-scout' ? { ...l, passedAt: null } : l)) };
    expect(must(arrivalPlanOf(scafell, withoutKinder), 'plan').fromMetres).toBe(landmarkOf('big-ben').height);
  });

  it('draws the chart as it was: the earned landmark is the Next card and nothing above it is passed', () => {
    const plan = must(arrivalPlanOf(scafell, achievementsAt(scafellMetres, ['yr-wyddfa'])), 'plan');
    expect(plan.before.altitude.nextLandmark?.key).toBe('scafell-pike');
    expect(plan.before.achievements.landmarks.find((l) => l.key === 'scafell-pike')?.passedAt).toBeNull();
    expect(plan.before.achievements.landmarks.find((l) => l.key === 'yr-wyddfa')?.passedAt).toBeNull();
    expect(plan.before.achievements.landmarks.find((l) => l.key === 'kinder-scout')?.passedAt).not.toBeNull();
  });

  it('puts the earned landmark\'s Next card higher up the chart than the bubble\'s start', () => {
    const plan = must(arrivalPlanOf(scafell, achievementsAt(scafellMetres)), 'plan');
    const { rows, marker } = altitudeLayoutOf(plan.before.altitude, plan.before.achievements, NOW, undefined);
    expect(must(rows.find((r) => r.key === 'scafell-pike'), 'row').shownOffset).toBeLessThan(marker.shownOffset);
  });

  it('is null for something that is not a landmark', () => {
    expect(arrivalPlanOf(makeRewardUnlock('clean-sheet'), achievementsAt(scafellMetres))).toBeNull();
  });
});

describe('coverOfNextCard', () => {
  const WINDOW = 393;
  const PILL = 190;
  const cardWidth = WINDOW - NEXT_CARD_LEFT - NEXT_CARD_RIGHT;

  it('grows the bubble to a little wider than the Next card and centres it on the card', () => {
    const { scale, shiftX } = coverOfNextCard(PILL, WINDOW);
    expect(PILL * scale).toBeCloseTo(cardWidth * ARRIVAL_SCALE.oversize);
    expect(PILL * scale).toBeGreaterThan(cardWidth);
    expect(PILL_LEFT + PILL / 2 + shiftX).toBeCloseTo(NEXT_CARD_LEFT + cardWidth / 2);
  });

  it('leaves the bubble alone until its width is known', () => {
    expect(coverOfNextCard(0, WINDOW)).toEqual({ scale: 1, shiftX: 0 });
  });
});

describe('countedMetresOf', () => {
  const plan = { fromMetres: landmarkOf('kinder-scout').height, toMetres: landmarkOf('scafell-pike').height };

  it('counts from the previous landmark\'s height to the earned one\'s', () => {
    expect(countedMetresOf(plan, 0)).toBe(plan.fromMetres);
    expect(countedMetresOf(plan, 1)).toBe(plan.toMetres);
  });

  it('is between the two heights part way, in whole metres', () => {
    const half = countedMetresOf(plan, 0.5);
    expect(half).toBe(Math.round((plan.fromMetres + plan.toMetres) / 2));
    expect(Number.isInteger(half)).toBe(true);
  });
});

describe('badgeFullScale', () => {
  it('makes the badge the set number of screens across, measured on the longer side', () => {
    const portrait = badgeFullScale(393, 852);
    expect(MEDAL_SIZE * portrait).toBeCloseTo(852 * ARRIVAL_SCALE.screens);
    expect(badgeFullScale(852, 393)).toBe(portrait);
  });
});
