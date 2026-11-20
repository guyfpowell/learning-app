import { celebrationOrderOf, type QueuedRewards } from '@learning/shared';
import { isRecord } from '@/lib/guards';
import { useCelebrationQueueStore } from '@/store/celebrationQueue.store';

function isQueuedRewards(value: unknown): value is QueuedRewards {
  return isRecord(value) && Array.isArray(value.unlocked) && Array.isArray(value.landmarksPassed);
}

/**
 * Sends what an action earned to the celebration queue, in `celebrationOrderOf`'s order. The queue
 * leaves out an unlock already waiting or already shown, so the same payload arriving twice shows once.
 */
export function enqueueRewards(rewards: QueuedRewards): void {
  useCelebrationQueueStore.getState().enqueue(celebrationOrderOf(rewards));
}

/** `enqueueRewards` for a write's settle step, which sees its reply as `unknown`. A reply with no rewards queues nothing. */
export function enqueueRewardsOf(response: unknown): void {
  if (isRecord(response) && isQueuedRewards(response.rewards)) enqueueRewards(response.rewards);
}
