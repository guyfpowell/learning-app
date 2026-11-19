import { makeRewardUnlock, makeRewards } from '@/test-utils/achievements';
import { useCelebrationQueueStore } from '@/store/celebrationQueue.store';
import { enqueueRewards, enqueueRewardsOf } from '../rewards';

const MEDAL = makeRewardUnlock('first-light');
const OTHER_MEDAL = makeRewardUnlock('good-innings');
const LANDMARK = makeRewardUnlock('yr-wyddfa');

beforeEach(() => useCelebrationQueueStore.getState().clear());

describe('enqueueRewards', () => {
  it('queues the medals first, then the landmarks (strategy 4.1 rule 4)', () => {
    enqueueRewards(makeRewards({ unlocked: [MEDAL, OTHER_MEDAL], landmarksPassed: [LANDMARK] }));
    expect(useCelebrationQueueStore.getState().queue).toEqual([MEDAL, OTHER_MEDAL, LANDMARK]);
  });

  it('queues each unlock once, however many times the same payload arrives', () => {
    const rewards = makeRewards({ unlocked: [MEDAL], landmarksPassed: [LANDMARK] });
    enqueueRewards(rewards);
    enqueueRewards(rewards);
    expect(useCelebrationQueueStore.getState().queue).toEqual([MEDAL, LANDMARK]);
  });
});

describe('enqueueRewardsOf', () => {
  it('queues the rewards a response carries beside its record', () => {
    enqueueRewardsOf({ saved: true, rewards: makeRewards({ unlocked: [MEDAL] }) });
    expect(useCelebrationQueueStore.getState().queue).toEqual([MEDAL]);
  });

  it('queues nothing for a response with no rewards', () => {
    enqueueRewardsOf({ saved: true });
    enqueueRewardsOf(undefined);
    expect(useCelebrationQueueStore.getState().queue).toEqual([]);
  });
});
