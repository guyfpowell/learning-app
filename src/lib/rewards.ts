import type { Rewards } from '@learning/shared';
import { isRecord } from '@/lib/guards';
import { useCelebrationQueueStore } from '@/store/celebrationQueue.store';

/** What the celebration queue reads of a rewards payload: the unlocks, in the order they show. */
export type QueuedRewards = Pick<Rewards, 'unlocked' | 'landmarksPassed'>;

function isQueuedRewards(value: unknown): value is QueuedRewards {
  return isRecord(value) && Array.isArray(value.unlocked) && Array.isArray(value.landmarksPassed);
}

/**
 * Sends what an action earned to the celebration queue: medals and Trailhead steps, then landmarks
 * (strategy 4.1 rule 4; the metres chip comes after the queue empties). The queue leaves out an
 * unlock already waiting or already shown, so the same payload arriving twice shows once.
 */
export function enqueueRewards(rewards: QueuedRewards): void {
  useCelebrationQueueStore.getState().enqueue([...rewards.unlocked, ...rewards.landmarksPassed]);
}

/** `enqueueRewards` for a write's settle step, which sees its reply as `unknown`. A reply with no rewards queues nothing. */
export function enqueueRewardsOf(response: unknown): void {
  if (isRecord(response) && isQueuedRewards(response.rewards)) enqueueRewards(response.rewards);
}
