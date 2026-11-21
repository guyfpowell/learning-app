import { StyleSheet, View } from 'react-native';
import type { HeightChartOffsets, LevelRow } from '@learning/shared';
import { Text } from '@/components/ui/Text';
import { font } from '@/theme';
import { LeaderLine } from './LeaderLine';
import { NAME_LINE_HEIGHT_EM, canvasYOf } from './chartLayout';
import { slotStyleOf } from './chartStyles';
import { axisNumberStyleOf, levelLookAt, levelRowColoursOf } from './levelChartStyles';

const ROW_LEFT = 86;
const ROW_RIGHT = 44;
const NAME_SIZE = 15.5;
const DETAIL_SIZE = 12.5;
const NAME_TRACKING_EM = -0.01;
const NAME_DETAIL_GAP = 1;

/** A level's number on the axis, centred on its row. The learner's is a gold pill; In Orbit has none. */
function AxisNumber({ row, shownY }: { row: Extract<LevelRow, { kind: 'level' }>; shownY: number }) {
  const { box, text } = axisNumberStyleOf(row.state, levelLookAt(shownY));
  return (
    <View pointerEvents="none" style={slotStyleOf(shownY)}>
      {box === null ? (
        <Text testID={`level-number-${row.level}`} style={text}>{row.axisNumber}</Text>
      ) : (
        <View testID={`level-number-box-${row.level}`} style={box}>
          <Text testID={`level-number-${row.level}`} style={text}>{row.axisNumber}</Text>
        </View>
      )}
    </View>
  );
}

/**
 * One row of the Level view (design 2b): its leader line to the middle of its strip, its number on the axis, and its
 * name and range, centred on `shownOffset`. The learner's level has no words: the marker stands in its place.
 */
export function LevelRowView({ row }: { row: LevelRow & HeightChartOffsets }) {
  const id = row.kind === 'level' ? String(row.level) : row.kind;
  const shownY = canvasYOf(row.shownOffset);
  const look = levelLookAt(shownY);
  const colours = row.state === 'current' ? null : levelRowColoursOf(row.state, look);
  return (
    <>
      {colours !== null && (
        <LeaderLine testID={`level-leader-${id}`} trueY={canvasYOf(row.trueOffset)} shownY={shownY} colour={look.levelLeader} />
      )}
      {row.kind === 'level' && <AxisNumber row={row} shownY={shownY} />}
      {colours !== null && (
        <View testID={`level-slot-${id}`} pointerEvents="none" style={slotStyleOf(shownY)}>
          <View style={styles.words}>
            <Text testID={`level-row-${id}-name`} style={[styles.name, { color: colours.name }]} numberOfLines={1}>{row.name}</Text>
            <Text testID={`level-row-${id}-detail`} style={[styles.detail, { color: colours.detail }]} numberOfLines={1}>{row.range}</Text>
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  words:  { marginLeft: ROW_LEFT, marginRight: ROW_RIGHT, gap: NAME_DETAIL_GAP },
  name:   { fontFamily: font.extrabold, fontSize: NAME_SIZE, lineHeight: NAME_SIZE * NAME_LINE_HEIGHT_EM, letterSpacing: NAME_SIZE * NAME_TRACKING_EM },
  detail: { fontFamily: font.regular, fontSize: DETAIL_SIZE, lineHeight: DETAIL_SIZE * NAME_LINE_HEIGHT_EM },
});
