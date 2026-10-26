import { StyleSheet, Text } from 'react-native';
import { ERROR_CODES, ERROR_MESSAGES, SAVE_LOCK, type SaveLock } from '@learning/shared';
import { colors, font, fontSize } from '@/theme';
import { Button } from '@/components/ui/Button';

interface Props {
  saveLock: SaveLock;
  saving: boolean;
  /** Nothing to save yet (no name), or a follow-up is under way. */
  disabled: boolean;
  onSave: () => void;
  onUpgrade: () => void;
}

/** The build review's save: closed once the trial is over (079i3), locked behind the upgrade once the free path is spent (079a). */
export function ReviewSaveArea({ saveLock, saving, disabled, onSave, onUpgrade }: Props) {
  switch (saveLock) {
    case SAVE_LOCK.trialOver:
      return <Text testID="trial-over" style={styles.settled}>{ERROR_MESSAGES[ERROR_CODES.FRESH_PATH_TRIAL_OVER]}</Text>;
    case SAVE_LOCK.allowanceUsed:
      return (
        <>
          <Text testID="allowance-used" style={styles.settled}>{ERROR_MESSAGES[ERROR_CODES.ALBERT_ALLOWANCE_USED]}</Text>
          <Button testID="upgrade-to-save" label="Upgrade to save this path" onPress={onUpgrade} />
        </>
      );
    case SAVE_LOCK.open:
      return (
        <Button testID="accept-plan" label={saving ? 'Saving…' : 'Start this path'} disabled={disabled} onPress={onSave} />
      );
  }
}

const styles = StyleSheet.create({
  settled: { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.textStrong },
});
