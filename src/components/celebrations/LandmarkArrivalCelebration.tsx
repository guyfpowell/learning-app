import { type RewardUnlock } from '@learning/shared';
import { LandmarkArrival } from '@/components/altitudeChart/LandmarkArrival';
import { arrivalPlanOf } from '@/components/altitudeChart/arrivalSteps';
import { AchievementUnlock } from '@/components/quiz/AchievementUnlock';
import { Spinner } from '@/components/ui/Spinner';
import { useAchievements } from '@/hooks/useAchievements';
import { useAuthStore } from '@/store/auth.store';

/**
 * A landmark's full screen celebration: the arrival (the learner's bubble drops into the Altitude screen at the previous
 * landmark, floats up to this one and bursts into its card). It needs the landmark list to know where the bubble starts, so
 * while that loads it shows a spinner, and if it failed (already logged by `useAchievements`) it shows the plain landmark
 * card, never nothing. Back skips the animation and dismisses, as the card's Continue does.
 */
export function LandmarkArrivalCelebration({ unlock, onContinue }: { unlock: RewardUnlock; onContinue: () => void }) {
  const achievements = useAchievements();
  const name = useAuthStore((s) => s.user?.name ?? '');
  if (achievements.isError) return <AchievementUnlock unlock={unlock} onContinue={onContinue} />;
  if (achievements.data === undefined) return <Spinner fullScreen />;
  const plan = arrivalPlanOf(unlock, achievements.data);
  if (plan === null) return <AchievementUnlock unlock={unlock} onContinue={onContinue} />;
  return <LandmarkArrival plan={plan} name={name} onBack={onContinue} onContinue={onContinue} />;
}
