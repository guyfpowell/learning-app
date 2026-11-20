import { StyleSheet, View } from 'react-native';
import { ACHIEVEMENTS_BY_KEY, type LandmarkRow } from '@learning/shared';
import { Medal } from '@/components/ui/Medal';
import { Text } from '@/components/ui/Text';
import { colors, font } from '@/theme';
import { LandmarkLeader, ROW_MEDAL_SIZE } from './LandmarkRowView';
import { MEDAL_GAP, NAME_LINE_HEIGHT_EM, canvasYOf, topOf, type BandLook } from './chartLayout';
import { slotStyleOf } from './chartStyles';

const CARD_LEFT = 80;
const CARD_RIGHT = 44;
const NAME_SIZE = 17;
const EYEBROW_SIZE = 11;
const DETAIL_SIZE = 13;

/** The next landmark: a white card with a soft shadow and no ring, its medal in colour, centred on its shown offset, with its leader line and rail dot at its true height. */
export function NextLandmarkCard({ row, shownOffset, look }: { row: Extract<LandmarkRow, { state: 'next' }>; shownOffset: number; look: BandLook }) {
  const { key, name, detail, eyebrow } = row;
  return (
    <>
      <LandmarkLeader landmarkKey={key} state="next" trueY={topOf(row.position)} shownY={canvasYOf(shownOffset)} look={look} />
      <View testID={`landmark-slot-${key}`} pointerEvents="box-none" style={slotStyleOf(canvasYOf(shownOffset))}>
        <View testID={`landmark-row-${key}`} style={styles.card}>
          <Medal definition={ACHIEVEMENTS_BY_KEY[key]} size={ROW_MEDAL_SIZE} />
          <View style={styles.words}>
            <Text testID={`landmark-row-${key}-eyebrow`} style={styles.eyebrow}>{eyebrow}</Text>
            <Text testID={`landmark-row-${key}-name`} style={styles.name}>{name}</Text>
            <Text testID={`landmark-row-${key}-detail`} style={styles.detail}>{detail}</Text>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginLeft:        CARD_LEFT,
    marginRight:       CARD_RIGHT,
    flexDirection:     'row',
    alignItems:        'center',
    gap:               MEDAL_GAP,
    paddingVertical:   10,
    paddingHorizontal: 12,
    borderRadius:      20,
    backgroundColor:   colors.white,
    boxShadow: [
      { offsetX: 0, offsetY: 12, blurRadius: 28, color: 'rgba(18,21,34,0.18)' },
    ],
  },
  words:   { flex: 1, minWidth: 0, gap: 2 },
  eyebrow: { fontFamily: font.extrabold, fontSize: EYEBROW_SIZE, letterSpacing: EYEBROW_SIZE * 0.08, color: colors.brand },
  name:    { fontFamily: font.black, fontSize: NAME_SIZE, lineHeight: NAME_SIZE * NAME_LINE_HEIGHT_EM, letterSpacing: NAME_SIZE * -0.02, color: colors.textStrong },
  detail:  { fontFamily: font.bold, fontSize: DETAIL_SIZE, color: colors.brand },
});
