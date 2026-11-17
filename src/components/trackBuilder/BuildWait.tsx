import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { BUILD_LEAVE_LABEL, BUILD_OFFLINE_COPY, BUILD_WAIT_COPY, BUILD_WAIT_STAGE, type BuildWaitStage } from '@learning/shared';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { colors, font, fontSize, spacing } from '@/theme';

interface BuildWaitProps {
  /** Tapped with no signal: the start is saved and goes when the person is back online. */
  paused: boolean;
  stage: BuildWaitStage;
  /** The person may go: the build keeps running on the server and Albert tells them when it ends (ADR-020). */
  canLeave: boolean;
  onLeave: () => void;
}

/**
 * Seconds of nothing is where a person taps again or leaves, so the build screen says what is happening.
 * The words come from shared.
 *
 * **No progress bar and no percentage.** Latency tracks how long the track turns out to be, which is the
 * one thing we cannot know in advance, so a bar would be a guess presented as a measurement.
 */
export function BuildWait({ paused, stage, canLeave, onLeave }: BuildWaitProps) {
  return (
    <>
      <View testID="build-waiting" style={styles.waiting}>
        {stage !== BUILD_WAIT_STAGE.long && <ActivityIndicator color={colors.textMuted} />}
        <Text style={styles.text}>{paused ? BUILD_OFFLINE_COPY : BUILD_WAIT_COPY[stage]}</Text>
      </View>
      {canLeave && <Button testID="build-leave" label={BUILD_LEAVE_LABEL} variant="outline" onPress={onLeave} />}
    </>
  );
}

const styles = StyleSheet.create({
  waiting: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  text:    { flex: 1, fontFamily: font.regular, fontSize: fontSize.sm, color: colors.textMuted },
});
