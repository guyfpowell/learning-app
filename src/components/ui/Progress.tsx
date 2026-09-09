/**
 * Progress — horizontal progress bar — ticket 069 A3.
 *
 * Maps .asc-progress / .asc-progress__fill (and --coral variant) from the
 * design system. Used in lesson headers (quiz progress), track enrollment
 * cards, and anywhere a linear fill communicates completion.
 */
import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { colors, radius } from '@/theme';

export type ProgressTone = 'brand' | 'coral' | 'success';

interface ProgressProps extends Omit<ViewProps, 'children'> {
  /** Completion percentage 0–100. Values outside the range are clamped. */
  value: number;
  tone?: ProgressTone;
  /** Track height in points. Defaults to 6. */
  height?: number;
}

const fillColor: Record<ProgressTone, string> = {
  brand:   colors.brand,
  coral:   colors.coral,
  success: colors.success,
};

export function Progress({
  value,
  tone = 'brand',
  height = 6,
  style,
  ...rest
}: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }, style as object]} {...rest}>
      <View
        style={[
          styles.fill,
          {
            width:           `${clamped}%`,
            height,
            borderRadius:    height / 2,
            backgroundColor: fillColor[tone],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: colors.surfaceSunken,
    overflow:        'hidden',
    width:           '100%',
  },
  fill: {
    position: 'absolute',
    left:     0,
    top:      0,
  },
});
