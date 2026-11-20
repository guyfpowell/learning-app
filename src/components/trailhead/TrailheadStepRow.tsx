import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { STEP_GLYPH, trailheadStepArtOf, type TrailheadStepState, type TrailheadStepStatus } from '@learning/shared';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { colors, font, fontSize } from '@/theme';

const ICON_SIZE = 28;
const TICK_SIZE = 16;
const STEP_GLYPH_SIZE = 16;

/** The step's drawing, as a small step: the badge's fill and the glyph's colour for each state. */
const STATE_LOOK: Record<TrailheadStepState, { fill: string; border: string; glyph: string }> = {
  done: { fill: colors.brandSoft, border: colors.brandSoft, glyph: colors.brand },
  next: { fill: colors.brand, border: colors.brand, glyph: colors.white },
  todo: { fill: 'transparent', border: colors.borderStrong, glyph: colors.textMuted },
};

/** One of the seven steps: its drawing, its name, and a tick once done. Next is cobalt, to do is outlined. */
export function TrailheadStepRow({ step, state }: { step: TrailheadStepStatus; state: TrailheadStepState }) {
  const art = trailheadStepArtOf(step.key);
  const look = STATE_LOOK[state];
  return (
    <View testID={`trailhead-step-${step.key}-${state}`} style={styles.row}>
      <View testID={`trailhead-icon-${step.key}`} style={[styles.icon, { backgroundColor: look.fill, borderColor: look.border }]}>
        {art && (
          <Svg width={STEP_GLYPH_SIZE} height={STEP_GLYPH_SIZE} viewBox={STEP_GLYPH.viewBox} fill="none" stroke={look.glyph} strokeWidth={STEP_GLYPH.strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <Path d={art.glyph} />
          </Svg>
        )}
      </View>
      <Text style={[styles.name, state === 'next' && styles.nameNext, state === 'done' && styles.nameDone]}>{step.name}</Text>
      {state === 'done' && <Icon name="check" size={TICK_SIZE} color={colors.brand} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  icon: { width: ICON_SIZE, height: ICON_SIZE, borderRadius: ICON_SIZE / 2, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, fontFamily: font.semibold, fontSize: fontSize.base, color: colors.textBody },
  nameNext: { fontFamily: font.bold, color: colors.brand },
  nameDone: { color: colors.textMuted },
});
