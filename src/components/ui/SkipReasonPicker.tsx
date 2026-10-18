import { StyleSheet, Text, View } from 'react-native';
import { SKIP_REASONS, SKIP_REASON_LABELS, SKIP_REASON_QUESTION, type SkipReason } from '@learning/shared';
import { colors, font, fontSize, spacing } from '@/theme';
import { Button } from '@/components/ui/Button';

interface SkipReasonPickerProps {
  /** Picking a reason is the tap that confirms the skip (079c). */
  onPick: (reason: SkipReason) => void;
  onCancel: () => void;
}

/** Exactly the three reasons and a way out. No free text: it would be a barrier. */
export function SkipReasonPicker({ onPick, onCancel }: SkipReasonPickerProps) {
  return (
    <View testID="skip-reason-picker" accessibilityLabel={SKIP_REASON_QUESTION} style={styles.container}>
      <Text style={styles.prompt}>{SKIP_REASON_QUESTION}</Text>
      {SKIP_REASONS.map(reason => (
        <Button
          key={reason}
          testID={`skip-reason-${reason}`}
          label={SKIP_REASON_LABELS[reason]}
          variant="secondary"
          onPress={() => onPick(reason)}
        />
      ))}
      <Button testID="skip-reason-cancel" label="Cancel" variant="ghost" onPress={onCancel} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  prompt: {
    fontFamily: font.medium,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
  },
});
