import { PremiumSheet } from '@/components/ui/PremiumSheet';

interface PremiumModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

/** Shared upgrade prompt for the Tracks and Albert tabs. */
export function PremiumModal({ visible, onClose, onUpgrade }: PremiumModalProps) {
  return (
    <PremiumSheet
      testID="premium-modal"
      visible={visible}
      title="Premium Content"
      body="Upgrade to unlock unlimited access to all premium tracks."
      onUpgrade={onUpgrade}
      onClose={onClose}
    />
  );
}
