import { create } from 'zustand';
import type { RewardUnlock } from '@learning/shared';

type UnlockKey = RewardUnlock['key'];

interface CelebrationQueueState {
  /** The unlocks waiting to be shown, first in line first. */
  queue: readonly RewardUnlock[];
  /** Keys already shown this session. A dismissed unlock is never queued again, even while its `seen` write is pending or after it failed. */
  shown: readonly UnlockKey[];
  /** The one door every source uses. An unlock already waiting, or already shown, is left out. */
  enqueue: (unlocks: readonly RewardUnlock[]) => void;
  /** Takes an unlock out of the queue once the person has dismissed it. */
  dismiss: (key: UnlockKey) => void;
  /** A small message was tapped: the unlock stays first in line, now as the next size up (a sheet). */
  openSheet: (key: UnlockKey) => void;
  /** Sign-out: nothing waits and nothing is remembered for the next person. */
  clear: () => void;
}

/**
 * Every unlock waiting for its celebration (ADR-022 Decision 7, strategy 8.6). Not persisted: the server's
 * unseen list is the record, read again on start. Anything that earns an unlock calls `enqueue`.
 */
export const useCelebrationQueueStore = create<CelebrationQueueState>()((set) => ({
  queue: [],
  shown: [],
  enqueue: (unlocks) => set((state) => {
    const known = new Set<UnlockKey>([...state.shown, ...state.queue.map((item) => item.key)]);
    const added: RewardUnlock[] = [];
    for (const unlock of unlocks) {
      if (known.has(unlock.key)) continue;
      known.add(unlock.key);
      added.push(unlock);
    }
    return added.length === 0 ? state : { queue: [...state.queue, ...added] };
  }),
  dismiss: (key) => set((state) => ({
    queue: state.queue.filter((item) => item.key !== key),
    shown: state.shown.includes(key) ? state.shown : [...state.shown, key],
  })),
  openSheet: (key) => set((state) => ({
    queue: state.queue.map((item) => (item.key === key ? { ...item, celebration: 'sheet' } : item)),
  })),
  clear: () => set({ queue: [], shown: [] }),
}));
