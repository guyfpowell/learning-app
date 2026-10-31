import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { colors, font } from '@/theme';

/** The drawing is on a 64-unit square, so it keeps its shape at any size. */
const VIEW = 64;
/** The count's size and width as shares of the calendar's, and its centre (4px above the middle of the page at 56). */
const COUNT_SCALE = 0.42;
const COUNT_WIDTH = 0.6;
const COUNT_CENTRE_Y = 0.7 - 4 / 56;

/** The day streak: a coral calendar page with the streak count large on it. */
export function StreakCalendar({ streak, size = 56 }: { streak: number; size?: number }) {
  return (
    <View testID="streak-calendar" accessibilityLabel={`${streak}-day streak`} style={{ width: size, height: size }}>
      <Svg viewBox={`0 0 ${VIEW} ${VIEW}`} width={size} height={size}>
        <Rect x={6} y={12} width={52} height={46} rx={8} fill={colors.surface} stroke={colors.coral} strokeWidth={4} />
        <Path d="M6 20 A8 8 0 0 1 14 12 H50 A8 8 0 0 1 58 20 V27 H6 Z" fill={colors.coral} />
        <Rect x={17} y={5} width={5} height={14} rx={2.5} fill={colors.coralDark} />
        <Rect x={42} y={5} width={5} height={14} rx={2.5} fill={colors.coralDark} />
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
