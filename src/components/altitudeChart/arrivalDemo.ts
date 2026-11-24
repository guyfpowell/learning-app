import { landmarkOf, type LandmarkKey } from '@learning/shared';
import { makeAchievementsResponse, makeRewardUnlock } from '@/test-utils/achievements';
import { must } from '@/test-utils/must';
import { arrivalPlanOf, type ArrivalPlan } from './arrivalSteps';

/** The arrival the Profile dev rows play, on made-up data: a learner who has just passed `landmark`, so the bubble goes from the landmark below it (sea level for Big Ben) up to it. */
export function arrivalDemoPlan(landmark: LandmarkKey): ArrivalPlan {
  const plan = arrivalPlanOf(makeRewardUnlock(landmark), makeAchievementsResponse(landmarkOf(landmark).height));
  return must(plan, 'demo arrival plan');
}
