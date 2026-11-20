import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { STEP_GLYPH, trailheadStepArtOf, type AchievementKey, type TrailheadStepState } from '@learning/shared';
import { colors } from '@/theme';

const ICON_SIZE = 28;
const STEP_GLYPH_SIZE = 16;

/** The step's drawing, as a small step: the badge's fill and the glyph's colour for each state. */
const STATE_LOOK: Record<TrailheadStepState, { fill: string; border: string; glyph: string }> = {
  done: { fill: colors.brandSoft, border: colors.brandSoft, glyph: colors.brand },
  next: { fill: colors.brand, border: colors.brand, glyph: colors.white },
  todo: { fill: 'transparent', border: colors.borderStrong, glyph: colors.textMuted },
};

/** A Trailhead step's round icon with its glyph: the Trailhead card's rows and the week's Trailhead rows. */
export function TrailheadStepIcon({ stepKey, state }: { stepKey: AchievementKey; state: TrailheadStepState }) {
  const art = trailheadStepArtOf(stepKey);
  const look = STATE_LOOK[state];
  return (
    <View testID={`trailhead-icon-${stepKey}`} style={[styles.icon, { backgroundColor: look.fill, borderColor: look.border }]}>
      {art && (
        <Svg width={STEP_GLYPH_SIZE} height={STEP_GLYPH_SIZE} viewBox={STEP_GLYPH.viewBox} fill="none" stroke={look.glyph} strokeWidth={STEP_GLYPH.strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <Path d={art.glyph} />
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  icon: { width: ICON_SIZE, height: ICON_SIZE, borderRadius: ICON_SIZE / 2, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
