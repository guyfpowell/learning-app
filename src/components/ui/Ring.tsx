/**
 * Ring — circular SVG progress ring — ticket 069 A3.
 *
 * Maps .asc-ring (and --coral / --success variants) from the design system.
 * SVG path lifted from ui_kits/mobile/mobile.jsx Ring component.
 *
 * Uses react-native-svg (added ticket 021). The label is centred inside the
 * ring using absolute positioning — a Text over the SVG view.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, font, fontSize } from '@/theme';

export type RingTone = 'brand' | 'coral' | 'success';

interface RingProps {
  /** Completion percentage 0–100. */
  value: number;
  size?: number;
  stroke?: number;
  tone?: RingTone;
  /** Custom label — defaults to "{value}%". */
  label?: string;
}

const trackColor: Record<RingTone, string> = {
  brand:   colors.brandSoft,
  coral:   colors.coralSoft,
  success: colors.successSoft,
};

const fillColor: Record<RingTone, string> = {
  brand:   colors.brand,
  coral:   colors.coral,
  success: colors.success,
};

export function Ring({
  value,
  size = 96,
  stroke = 10,
  tone = 'brand',
  label,
}: RingProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - clamped / 100);
  const displayLabel = label ?? `${Math.round(clamped)}%`;
  const labelSize = Math.round(size * 0.26);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          stroke={trackColor[tone]}
          fill="none"
          // rotate so the gap is at the top
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
        {/* Fill */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          stroke={fillColor[tone]}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {/* Label centred over the SVG */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.labelContainer}>
          <Text style={[styles.label, { fontSize: labelSize, color: fillColor[tone] }]}>
            {displayLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelContainer: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: font.display,
  },
});
