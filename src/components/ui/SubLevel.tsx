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
/** The box is a third as tall as it is wide. */
const HEIGHT_RATIO = 0.32;
/** Above this width the trail is drawn in finer strokes (the level-up screen). */
const LARGE_FROM = 120;

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
  return (
    <View accessible accessibilityLabel={`Level ${n} of ${STEPS}`}>
      <Svg width={width} height={width * HEIGHT_RATIO} viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} style={{ overflow: 'visible' }}>
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
