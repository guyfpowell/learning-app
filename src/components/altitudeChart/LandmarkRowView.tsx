import { Pressable, StyleSheet, View } from 'react-native';
import { ACHIEVEMENTS_BY_KEY, type PlacedLandmarkRow } from '@learning/shared';
import { Medal } from '@/components/ui/Medal';
import { Text } from '@/components/ui/Text';
import { font } from '@/theme';
import { LeaderLine } from './LeaderLine';
import { MEDAL_GAP, NAME_LINE_HEIGHT_EM, canvasYOf, type BandLook } from './chartLayout';
import { dotStyleOf, rowColoursOf, slotStyleOf } from './chartStyles';

/** The medal's width in a row, and in the next landmark's card. */
export const ROW_MEDAL_SIZE = 46;
const ROW_LEFT = 86;
const ROW_RIGHT = 44;
const NAME_SIZE = 16;
const DETAIL_SIZE = 13;

/** A passed or locked landmark's row, centred on its shown offset, and its leader line and rail dot at its true height. `onPress` opens its sheet; null for a row with no sheet (a landmark not passed yet). */
export function LandmarkRowView({
  row, look, onPress,
}: { row: Exclude<PlacedLandmarkRow, { state: 'next' }>; look: BandLook; onPress: (() => void) | null }) {
  const { key, name, detail, state } = row;
  const colours = rowColoursOf(state, look);
  return (
    <>
      <LandmarkLeader row={row} look={look} />
      <View testID={`landmark-slot-${key}`} pointerEvents="box-none" style={slotStyleOf(canvasYOf(row.shownOffset))}>
        <Pressable
          testID={`landmark-row-${key}`}
          accessibilityRole={onPress === null ? undefined : 'button'}
          disabled={onPress === null}
          onPress={onPress ?? undefined}
          style={styles.row}
        >
          <Medal definition={ACHIEVEMENTS_BY_KEY[key]} size={ROW_MEDAL_SIZE} locked={state === 'locked'} />
          <View style={styles.words}>
            <Text testID={`landmark-row-${key}-name`} style={[styles.name, { color: colours.name }]} numberOfLines={1}>{name}</Text>
            <Text testID={`landmark-row-${key}-detail`} style={[styles.detail, { color: colours.detail }]} numberOfLines={1}>{detail}</Text>
          </View>
        </Pressable>
      </View>
    </>
  );
}

/** A landmark's leader line, from its dot on the rail at its true height to its row's (or card's) shown centre, moved or not. */
export function LandmarkLeader({ row, look }: { row: PlacedLandmarkRow; look: BandLook }) {
  const trueY = canvasYOf(row.trueOffset);
  return (
    <>
      <LeaderLine testID={`landmark-leader-${row.key}`} trueY={trueY} shownY={canvasYOf(row.shownOffset)} colour={look.leader} />
      <View testID={`landmark-dot-${row.key}`} pointerEvents="none" style={dotStyleOf(trueY, row.state, look)} />
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    marginLeft:    ROW_LEFT,
    marginRight:   ROW_RIGHT,
    flexDirection: 'row',
    alignItems:    'center',
    gap:           MEDAL_GAP,
  },
  words:  { flex: 1, minWidth: 0, gap: 1 },
  name:   { fontFamily: font.extrabold, fontSize: NAME_SIZE, lineHeight: NAME_SIZE * NAME_LINE_HEIGHT_EM, letterSpacing: NAME_SIZE * -0.01 },
  detail: { fontFamily: font.regular, fontSize: DETAIL_SIZE },
});
