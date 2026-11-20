import { StyleSheet, View } from 'react-native';
import { initialsOf, metresLabel, youMarkerCopy } from '@learning/shared';
import { Text } from '@/components/ui/Text';
import { colors, font } from '@/theme';
import { LeaderLine } from './LeaderLine';
import { canvasYOf } from './chartLayout';
import { slotStyleOf } from './chartStyles';

const PILL_LEFT = 82;
const AVATAR_SIZE = 36;
const LINE_HEIGHT = 1.1;
const METRES_SIZE = 19;
const LEVEL_SIZE = 12.5;
const METRES_INK = '#3D2800';

/** The learner's place on the chart: the gold pill with their initials, the metres and "Level 10 · you", centred on `shownOffset`. A pill that was moved clear of a landmark has a gold leader line down to the learner's true height on the rail. */
export function YouMarker({ name, metres, level, offsets }: { name: string; metres: number; level: number; offsets: { trueOffset: number; shownOffset: number } }) {
  const shownY = canvasYOf(offsets.shownOffset);
  const trueY = canvasYOf(offsets.trueOffset);
  return (
    <>
      {shownY !== trueY && <LeaderLine testID="altitude-marker-leader" trueY={trueY} shownY={shownY} colour={colors.altitude} />}
      <View testID="altitude-marker" pointerEvents="box-none" style={slotStyleOf(shownY)}>
        <View style={styles.pill}>
          <View style={styles.avatar}>
            <Text testID="altitude-marker-initials" style={styles.initials}>{initialsOf(name)}</Text>
          </View>
          <View style={styles.words}>
            <Text testID="altitude-marker-metres" style={styles.metres}>{metresLabel(metres)}</Text>
            <Text testID="altitude-marker-level" style={styles.level}>{youMarkerCopy(level)}</Text>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf:         'flex-start',
    marginLeft:        PILL_LEFT,
    flexDirection:     'row',
    alignItems:        'center',
    gap:               10,
    paddingVertical:   6,
    paddingLeft:       6,
    paddingRight:      16,
    borderRadius:      999,
    backgroundColor:   colors.altitude,
    boxShadow: [
      { offsetX: 0, offsetY: 3, blurRadius: 0, color: colors.altitudeDark },
      { offsetX: 0, offsetY: 10, blurRadius: 24, color: 'rgba(150,95,0,0.28)' },
    ],
  },
  avatar: {
    width:           AVATAR_SIZE,
    height:          AVATAR_SIZE,
    borderRadius:    AVATAR_SIZE / 2,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: colors.white,
  },
  initials: { fontFamily: font.black, fontSize: 14, color: colors.altitudeText },
  words:    { justifyContent: 'center' },
  metres:   { fontFamily: font.black, fontSize: METRES_SIZE, lineHeight: METRES_SIZE * LINE_HEIGHT, letterSpacing: METRES_SIZE * -0.02, color: METRES_INK },
  level:    { fontFamily: font.extrabold, fontSize: LEVEL_SIZE, lineHeight: LEVEL_SIZE * LINE_HEIGHT, color: colors.altitudeText },
});
