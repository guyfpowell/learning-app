import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '@/theme';

const GRID = 24;
/** The page's white body: a grid of day dots sits on it. */
const BODY = { x: 4.5, y: 10, width: 15, height: 9.5 } as const;
const DOT = 1.8;
const DOT_GAP = 1.2;
const DOT_COLUMNS = 5;
const DOT_ROWS = 3;
const DOT_OPACITY = 0.55;
const DOT_ORIGIN = { x: 5.1, y: 10.9 } as const;
/** The badge at the page's lower right, cut out of the page like a stamp. */
const BADGE = { cx: 17.2, cy: 17.2, cutRadius: 6.4, radius: 5.2, ring: 1.5 } as const;
/** A tick in the badge: the day is done. */
const TICK = 'M14.2 17.3l2 2 3.6-4';
const TICK_STROKE = 1.7;

const DOTS = Array.from({ length: DOT_COLUMNS * DOT_ROWS }, (_, i) => ({
  x: DOT_ORIGIN.x + (i % DOT_COLUMNS) * (DOT + DOT_GAP),
  y: DOT_ORIGIN.y + Math.floor(i / DOT_COLUMNS) * (DOT + DOT_GAP),
}));

/** The streak mark: a coral calendar page with cobalt binder rings and a grid of day dots, and, once there is a streak (`done`), a ticked badge at its lower right. With no streak it is the calendar alone. It holds no number: the count sits beside it. */
export function StreakCalendarIcon({ size = 20, done }: { size?: number; done: boolean }) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg testID="streak-calendar-icon" viewBox={`0 0 ${GRID} ${GRID}`} width={size} height={size} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Rect x={2.5} y={4.5} width={19} height={17} rx={4} fill={colors.coral} />
        <Rect x={BODY.x} y={BODY.y} width={BODY.width} height={BODY.height} rx={2} fill={colors.white} />
        {DOTS.map(d => (
          <Rect key={`${d.x}-${d.y}`} x={d.x} y={d.y} width={DOT} height={DOT} rx={0.5} fill={colors.coral} fillOpacity={DOT_OPACITY} />
        ))}
        <Rect x={7} y={1.5} width={2.4} height={5.5} rx={1.2} fill={colors.brand} />
        <Rect x={14.6} y={1.5} width={2.4} height={5.5} rx={1.2} fill={colors.brand} />
        {done && (
          <>
            <Circle cx={BADGE.cx} cy={BADGE.cy} r={BADGE.cutRadius} fill={colors.paper} />
            <Circle cx={BADGE.cx} cy={BADGE.cy} r={BADGE.radius} fill={colors.white} stroke={colors.coral} strokeWidth={BADGE.ring} />
            <Path d={TICK} fill="none" stroke={colors.textStrong} strokeWidth={TICK_STROKE} strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
      </Svg>
    </View>
  );
}
