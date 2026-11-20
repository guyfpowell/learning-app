import { Modal } from 'react-native';
import { MedalSheet, celebrationItemOf } from '@/components/achievements/MedalSheet';
import { SmallMessage } from '@/components/celebrations/SmallMessage';
import { AchievementUnlock } from '@/components/quiz/AchievementUnlock';
import { useSafeWrite } from '@/hooks/useSafeWrite';
import { useUnseenAchievements } from '@/hooks/useUnseenAchievements';
import { MARK_ACHIEVEMENT_SEEN_WRITE, type MarkAchievementSeenInput } from '@/lib/safeWrites';
import { useCelebrationQueueStore } from '@/store/celebrationQueue.store';
import { smallMessageCountOf } from '@learning/shared';

/**
 * The app's one celebration queue, mounted once at the root: it reads the unseen list and shows the next
 * unlock over whatever screen is open: a `toast` as a small message, a `sheet` as the medal's bottom sheet,
 * a `full` as a full screen. The server chose each size. Dismissing one takes it out of the queue first, then
 * sends `seen` through the safe-write path, so the unlock never comes back while that write is pending or if it fails.
 */
export function CelebrationQueue() {
  useUnseenAchievements();
  const current = useCelebrationQueueStore((s) => s.queue[0]);
  const smallMessageCount = useCelebrationQueueStore((s) => smallMessageCountOf(s.queue));
  const dismiss = useCelebrationQueueStore((s) => s.dismiss);
  const openSheet = useCelebrationQueueStore((s) => s.openSheet);
  const markSeen = useSafeWrite<MarkAchievementSeenInput, void>(MARK_ACHIEVEMENT_SEEN_WRITE);

  if (current === undefined) return null;
  const onContinue = () => {
    dismiss(current.key);
    markSeen.mutate({ key: current.key });
  };
  if (current.celebration === 'toast') {
    return <SmallMessage key={current.key} unlock={current} count={smallMessageCount} onDone={onContinue} onOpen={() => openSheet(current.key)} />;
  }
  if (current.celebration === 'sheet') {
    return <MedalSheet key={current.key} item={celebrationItemOf(current)} celebrating onClose={onContinue} />;
  }
  return (
    <Modal visible transparent={false} animationType="fade" statusBarTranslucent onRequestClose={onContinue}>
      {/* key: a second unlock must remount, or its backdrop sticks (context/app.md). */}
      <AchievementUnlock key={current.key} unlock={current} onContinue={onContinue} />
    </Modal>
  );
}
