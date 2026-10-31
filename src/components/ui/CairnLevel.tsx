import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, spacing } from '@/theme';

/** The API splits each level name into this many steps (XpService LEVEL_NAMES). */
export const CAIRN_COUNT = 5;

/** The smallest cairn's size in points, and how much larger each next one is. */
const FIRST_SIZE = 12;
const SIZE_STEP = 2.5;

const VIEW_WIDTH = 24;
const VIEW_HEIGHT = 14;
/** A stone is wider than it is tall; its height is this share of its width. */
const HEIGHT_SHARE = VIEW_HEIGHT / VIEW_WIDTH;
const STROKE = 1.5;

/**
 * One stone: a flat oval (21 by 12 units, even top and bottom) with its very bottom ground off, half a unit,
 * which leaves a short flat to sit on. The cut line is the box's bottom edge (13.2 plus half the stroke).
 */
const PEBBLE = 'M7.8 13.2 L16.2 13.2 A10.5 6 0 1 0 7.8 13.2 Z';

function Cairn({ size, filled, testID }: { size: number; filled: boolean; testID: string }) {
  const height = size * HEIGHT_SHARE;
  return (
    <View testID={testID} style={{ width: size, height }}>
      <Svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} width={size} height={height}>
        <Path
          d={PEBBLE}
          fill={filled ? colors.xp : 'none'}
          stroke={colors.xp}
          strokeWidth={STROKE}
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

/**
 * A level's step as five stones of growing size, all standing on one line: the first `level` are filled, the rest outlined,
 * so step 2 is two filled and three outlined.
 */
export function CairnLevel({ level }: { level: number }) {
  const reached = Math.min(Math.max(Math.round(level), 1), CAIRN_COUNT);
  return (
    <View testID="cairn-level" accessibilityLabel={`Level ${reached} of ${CAIRN_COUNT}`} accessible style={styles.row}>
      {Array.from({ length: CAIRN_COUNT }, (_, i) => (
        <Cairn
          key={i}
          testID={`cairn-${i}-${i < reached ? 'filled' : 'outline'}`}
          size={FIRST_SIZE + i * SIZE_STEP}
          filled={i < reached}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // Every stone stands on the same line, so they get taller left to right; the caller puts that line on the text's baseline.
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs },
});
