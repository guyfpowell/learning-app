import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { colors, font } from '@/theme';

/** The calendar's tick grid holds this many; past it the ticks stay and only the count climbs. */
export const MAX_TICKS = 6;
const TICK_COLUMNS = 3;
const TICK_CENTRES_X = [20, 32, 44];
const TICK_CENTRES_Y = [36, 46];

/** The drawing is on a 64-unit square, so it keeps its shape at any size. */
const VIEW = 64;
/** The count's size and width as shares of the calendar's, and its centre (4px above the middle of the page at 56). */
const COUNT_SCALE = 0.42;
const COUNT_WIDTH = 0.6;
const COUNT_CENTRE_Y = 0.7 - 4 / 56;
// The ticks sit behind the count and are barely there: thin and faint, so the number is the lead.
const TICK_OPACITY = 0.25;
const TICK_STROKE = 2;

/** One tick per day of the streak (up to the grid), filling the top row left to right, then the next. */
export function calendarTicks(streak: number): string {
  const count = Math.min(Math.max(Math.floor(streak), 0), MAX_TICKS);
  return Array.from({ length: count }, (_, i) => {
    const cx = TICK_CENTRES_X[i % TICK_COLUMNS] ?? 0;
    const cy = TICK_CENTRES_Y[Math.floor(i / TICK_COLUMNS)] ?? 0;
    return `M${cx - 6} ${cy} L${cx - 2} ${cy + 4} L${cx + 6} ${cy - 5}`;
  }).join(' ');
}

/**
 * The day streak: a coral calendar page with a tick for each of the first six days, and the
 * streak count large over it.
 */
export function StreakCalendar({ streak, size = 56 }: { streak: number; size?: number }) {
  return (
    <View testID="streak-calendar" accessibilityLabel={`${streak}-day streak`} style={{ width: size, height: size }}>
      <Svg viewBox={`0 0 ${VIEW} ${VIEW}`} width={size} height={size}>
        <Rect x={6} y={12} width={52} height={46} rx={8} fill={colors.surface} stroke={colors.coral} strokeWidth={4} />
        <Path d="M6 20 A8 8 0 0 1 14 12 H50 A8 8 0 0 1 58 20 V27 H6 Z" fill={colors.coral} />
        <Rect x={17} y={5} width={5} height={14} rx={2.5} fill={colors.coralDark} />
        <Rect x={42} y={5} width={5} height={14} rx={2.5} fill={colors.coralDark} />
        <Path
          d={calendarTicks(streak)}
          fill="none"
          stroke={colors.coral}
          strokeOpacity={TICK_OPACITY}
          strokeWidth={TICK_STROKE}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      <View style={[styles.countBox, { width: size, height: size, top: size * COUNT_CENTRE_Y - size / 2 }]}>
        <Text
          testID="streak-calendar-count"
          style={[styles.count, { fontSize: size * COUNT_SCALE, width: size * COUNT_WIDTH }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {streak}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  countBox: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  count: {
    fontFamily: font.display,
    color:      colors.brand,
    textAlign:  'center',
  },
});
