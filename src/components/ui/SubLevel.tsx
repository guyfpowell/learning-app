import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Line } from 'react-native-svg';
import { colors } from '@/theme';

/** Five steps to a level; the API's `LEVEL_NAMES` has five. */
const STEPS = 5;
/** The five waypoints, rising to the right, on a 100 by 32 box. */
const POINTS = [[6, 26], [28, 21], [50, 17], [72, 11], [94, 5]] as const;
const VIEW_WIDTH = 100;
const VIEW_HEIGHT = 32;
/** Above this width the trail is drawn in finer strokes (the level-up screen). */
const LARGE_FROM = 120;

/** Room around the box, in box units: the current stop's halo reaches 11 units past a point. iOS clips an Svg at its own bounds, so `overflow: visible` does not help. */
const PAD = 12;

/** The area to draw (the box plus its padding) and the negative margin that cancels the padding, so the trail takes `width` by `width * 0.32` in the layout. */
export function trailFrame(width: number) {
  const scale = width / VIEW_WIDTH;
  return {
    minX: -PAD,
    minY: -PAD,
    drawWidth: VIEW_WIDTH + PAD * 2,
    drawHeight: VIEW_HEIGHT + PAD * 2,
    scaledWidth: (VIEW_WIDTH + PAD * 2) * scale,
    scaledHeight: (VIEW_HEIGHT + PAD * 2) * scale,
    margin: -PAD * scale,
  };
}

/**
 * The sub-level indicator (Foothills I to V), as a trail: five waypoints on a rising path.
 * Done stops are solid gold, the current stop is a ring with a halo, and what is ahead is dotted.
 * `level` is the step, 1 to 5.
 */
export function SubLevel({ level, width = 72 }: { level: number; width?: number }) {
  const n = Math.min(Math.max(Math.round(level), 1), STEPS);
  const large = width > LARGE_FROM;
  const dot = large ? 4.2 : 6.2;
  const ring = large ? 6 : 8;
  const dotted = large ? '1 5' : '0.1 7';
  const frame = trailFrame(width);
  return (
    <View accessible accessibilityLabel={`Level ${n} of ${STEPS}`}>
      <Svg
        width={frame.scaledWidth}
        height={frame.scaledHeight}
        viewBox={`${frame.minX} ${frame.minY} ${frame.drawWidth} ${frame.drawHeight}`}
        style={{ margin: frame.margin }}
      >
        {POINTS.slice(0, STEPS - 1).map((p, i) => {
          const done = i < n - 1;
          const [x2, y2] = POINTS[i + 1];
          return (
            <Line
              key={i}
              x1={p[0]}
              y1={p[1]}
              x2={x2}
              y2={y2}
              stroke={done ? colors.xp : colors.border}
              strokeWidth={large ? 2.6 : 4}
              strokeLinecap="round"
              strokeDasharray={done ? undefined : dotted}
            />
          );
        })}
        {POINTS.map((p, i) => {
          if (i < n - 1) return <Circle key={i} cx={p[0]} cy={p[1]} r={dot} fill={colors.xp} stroke={colors.xpEdge} strokeWidth={1.2} />;
          if (i === n - 1) {
            return (
              <G key={i}>
                <Circle cx={p[0]} cy={p[1]} r={ring + 3} fill={colors.xp} opacity={0.22} />
                <Circle cx={p[0]} cy={p[1]} r={ring} fill={colors.xp} stroke={colors.xpEdge} strokeWidth={1.4} />
                <Circle cx={p[0]} cy={p[1]} r={ring * 0.38} fill={colors.white} />
              </G>
            );
          }
          return <Circle key={i} cx={p[0]} cy={p[1]} r={dot} fill={colors.white} stroke={colors.border} strokeWidth={large ? 1.6 : 2.6} />;
        })}
      </Svg>
    </View>
  );
}
