import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/** A ring is a ellipse 22% flatter than it is wide, wobbled by three sine waves (the design's `contours()`). */
const RING_FLATNESS = 0.78;
const RING_STEPS = 96;
const WOBBLE = { three: 0.09, five: 0.05, two: 0.03 } as const;
const SEED_MODULUS = 233280;

interface ContourSpec {
  cx: number;
  cy: number;
  rings: number;
  innerRadius: number;
  ringGap: number;
  seed?: number;
}

/** The same seed always draws the same map, so a screen never changes shape on re-render. */
export function contourPaths({ cx, cy, rings, innerRadius, ringGap, seed = 1 }: ContourSpec): string[] {
  let s = seed;
  const rnd = () => {
    s = (s * 9301 + 49297) % SEED_MODULUS;
    return s / SEED_MODULUS;
  };
  const phase = [rnd() * 6, rnd() * 6, rnd() * 6];
  return Array.from({ length: rings }, (_, i) => {
    const r = innerRadius + i * ringGap;
    let d = '';
    for (let k = 0; k <= RING_STEPS; k++) {
      const t = (k / RING_STEPS) * Math.PI * 2;
      const wobble =
        1 +
        WOBBLE.three * Math.sin(3 * t + phase[0] + i * 0.18) +
        WOBBLE.five * Math.sin(5 * t + phase[1] - i * 0.11) +
        WOBBLE.two * Math.sin(2 * t + phase[2]);
      const rr = r * wobble;
      d += `${k ? 'L' : 'M'}${(cx + rr * Math.cos(t)).toFixed(1)} ${(cy + rr * RING_FLATNESS * Math.sin(t)).toFixed(1)}`;
    }
    return `${d}z`;
  });
}

interface ContoursProps extends Partial<ContourSpec> {
  color: string;
  opacity: number;
  width: number;
  height: number;
  testID?: string;
}

/** Thin wobbly map rings: the design's texture on the cobalt and results surfaces. */
export function Contours({ color, opacity, width, height, testID, cx = width * 0.85, cy = 0, rings = 14, innerRadius = 40, ringGap = 28, seed }: ContoursProps) {
  const paths = contourPaths({ cx, cy, rings, innerRadius, ringGap, seed });
  return (
    <View
      testID={testID}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
        {paths.map((d, i) => (
          <Path key={i} d={d} stroke={color} strokeOpacity={opacity} strokeWidth={1} />
        ))}
      </Svg>
    </View>
  );
}
