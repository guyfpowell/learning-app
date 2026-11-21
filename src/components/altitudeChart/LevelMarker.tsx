import { StyleSheet, View } from 'react-native';
import { initialsOf, levelMarkerOf, type AltitudeResponse, type HeightChartOffsets } from '@learning/shared';
import { Text } from '@/components/ui/Text';
import { colors, font } from '@/theme';
import { LeaderLine } from './LeaderLine';
import { ALTITUDE_INK, canvasYOf } from './chartLayout';
import { slotStyleOf } from './chartStyles';

const PILL_LEFT = 82;
const PILL_WIDTH = 271;
const AVATAR_SIZE = 40;
const LINE_HEIGHT = 1.15;
const EYEBROW_SIZE = 11;
const NAME_SIZE = 18;
const DETAIL_SIZE = 12.5;
const PILL_GAP = 10;
const PILL_PADDING_V = 7;
const PILL_PADDING_END = 16;
const PILL_RADIUS = 22;
const EYEBROW_TRACKING_EM = 0.08;
const NAME_TRACKING_EM = -0.02;

/** The learner's place in the Level view (design 2b): the gold box with their initials, "LEVEL 10", the level's full name and the metres to the next level, centred on `shownOffset`. A box moved clear of a row has a gold leader line down to the learner's true height on the rail. */
export function LevelMarker({ name, altitude, offsets }: { name: string; altitude: Pick<AltitudeResponse, 'metres' | 'level' | 'nextLevel'>; offsets: HeightChartOffsets }) {
  const shownY = canvasYOf(offsets.shownOffset);
  const trueY = canvasYOf(offsets.trueOffset);
  const marker = levelMarkerOf(altitude);
  return (
    <>
      {shownY !== trueY && <LeaderLine testID="level-marker-leader" trueY={trueY} shownY={shownY} colour={colors.altitude} />}
      <View testID="level-marker-slot" pointerEvents="box-none" style={slotStyleOf(shownY)}>
        <View testID="level-marker" style={styles.pill}>
          <View style={styles.avatar}>
            <Text testID="level-marker-initials" style={styles.initials}>{initialsOf(name)}</Text>
          </View>
          <View style={styles.words}>
            <Text testID="level-marker-eyebrow" style={styles.eyebrow}>{marker.eyebrow}</Text>
            <Text testID="level-marker-name" style={styles.name}>{marker.name}</Text>
            <Text testID="level-marker-detail" style={styles.detail}>{marker.detail}</Text>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    marginLeft:      PILL_LEFT,
    width:           PILL_WIDTH,
    flexDirection:   'row',
    alignItems:      'center',
    gap:             PILL_GAP,
    paddingVertical: PILL_PADDING_V,
    paddingLeft:     PILL_PADDING_V,
    paddingRight:    PILL_PADDING_END,
    borderRadius:    PILL_RADIUS,
    backgroundColor: colors.altitude,
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
  words:    { flex: 1, minWidth: 0 },
  eyebrow:  { fontFamily: font.extrabold, fontSize: EYEBROW_SIZE, lineHeight: EYEBROW_SIZE * LINE_HEIGHT, letterSpacing: EYEBROW_SIZE * EYEBROW_TRACKING_EM, color: colors.altitudeText },
  name:     { fontFamily: font.black, fontSize: NAME_SIZE, lineHeight: NAME_SIZE * LINE_HEIGHT, letterSpacing: NAME_SIZE * NAME_TRACKING_EM, color: ALTITUDE_INK },
  detail:   { fontFamily: font.bold, fontSize: DETAIL_SIZE, lineHeight: DETAIL_SIZE * LINE_HEIGHT, color: colors.altitudeText },
});
