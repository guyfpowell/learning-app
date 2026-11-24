import type { LandmarkKey } from '@learning/shared';
import { landmarkOf } from '@learning/shared';
import { makeAchievementsResponse, makeRewardUnlock } from '@/test-utils/achievements';
import { arrivalPlanOf, type ArrivalPlan } from './arrivalSteps';
import { must } from '@/test-utils/must';

/** The dev preview's landmark: Kinder Scout is the previous one, so the bubble goes from Kinder Scout up to this. */
export const ARRIVAL_DEMO_LANDMARK: LandmarkKey = 'scafell-pike';

/** The arrival the Profile dev row plays, on made-up data: a learner who has just passed Scafell Pike. */
export function arrivalDemoPlan(): ArrivalPlan {
  const plan = arrivalPlanOf(makeRewardUnlock(ARRIVAL_DEMO_LANDMARK), makeAchievementsResponse(landmarkOf(ARRIVAL_DEMO_LANDMARK).height));
  return must(plan, 'demo arrival plan');
}
