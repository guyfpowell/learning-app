import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { TrailheadStepState, TrailheadStepStatus } from '@learning/shared';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { TrailheadStepIcon } from './TrailheadStepIcon';
import { colors, font, fontSize } from '@/theme';

const TICK_SIZE = 16;

/** One of the seven steps: its drawing, its name, and a tick once done. Next is cobalt, to do is outlined. */
export function TrailheadStepRow({ step, state }: { step: TrailheadStepStatus; state: TrailheadStepState }) {
  return (
    <View testID={`trailhead-step-${step.key}-${state}`} style={styles.row}>
      <TrailheadStepIcon stepKey={step.key} state={state} />
      <Text style={[styles.name, state === 'next' && styles.nameNext, state === 'done' && styles.nameDone]}>{step.name}</Text>
      {state === 'done' && <Icon name="check" size={TICK_SIZE} color={colors.brand} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  name: { flex: 1, fontFamily: font.semibold, fontSize: fontSize.base, color: colors.textBody },
  nameNext: { fontFamily: font.bold, color: colors.brand },
  nameDone: { color: colors.textMuted },
});
