import { makeRewardUnlock } from '@/test-utils/achievements';
import { useCelebrationQueueStore } from '../celebrationQueue.store';

const medal = makeRewardUnlock('clean-sheet');
const step = makeRewardUnlock('first-light');

beforeEach(() => useCelebrationQueueStore.getState().clear());

describe('celebration queue', () => {
  it('shows an unlock once when the same key is enqueued twice', () => {
    const { enqueue } = useCelebrationQueueStore.getState();
    enqueue([medal]);
    enqueue([medal, step, step]);
    expect(useCelebrationQueueStore.getState().queue).toEqual([medal, step]);
  });

  it('does not queue a dismissed unlock again', () => {
    const { enqueue, dismiss } = useCelebrationQueueStore.getState();
    enqueue([medal]);
    dismiss(medal.key);
    enqueue([medal]);
    expect(useCelebrationQueueStore.getState().queue).toEqual([]);
  });

  it('empties on sign-out and forgets what was shown', () => {
    const { enqueue, dismiss, clear } = useCelebrationQueueStore.getState();
    enqueue([medal, step]);
    dismiss(medal.key);
    clear();
    enqueue([medal]);
    expect(useCelebrationQueueStore.getState().queue).toEqual([medal]);
  });

  it('turns the first small message into a sheet when it is opened, and keeps it first in line', () => {
    const toast = makeRewardUnlock('clean-sheet', { celebration: 'toast' });
    const { enqueue, openSheet } = useCelebrationQueueStore.getState();
    enqueue([toast, step]);
    openSheet(toast.key);
    expect(useCelebrationQueueStore.getState().queue).toEqual([{ ...toast, celebration: 'sheet' }, step]);
  });
});
