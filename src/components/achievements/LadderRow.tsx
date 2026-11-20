import { View, StyleSheet, Pressable, ScrollView, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { Medal } from '@/components/ui/Medal';
import {
  celebrationEyebrow,
  ladderCountCopy,
  ladderEarnedOf,
  rungItemOf,
  rungNoteOf,
  type AchievementKey,
  type Ladder,
  type Rung,
} from '@learning/shared';
import { colors, font } from '@/theme';

/** How far the next rung sits above the others, in points (the design's raised rung). */
export const RUNG_RAISE = 7;

const MEDAL_SIZE = 56;
const RUNG_WIDTH = 84;
const RUNG_GAP = 2;
/** The fade over the last rungs, which shows there are more to scroll to. */
const FADE_WIDTH = 56;
const FADE_CLEAR = `${colors.paper}00`;

/** The next rung is lifted; every other rung sits flat. */
export function rungStyleOf({ isNextRung }: Pick<Rung, 'isNextRung'>): ViewStyle {
  return isNextRung ? { transform: [{ translateY: -RUNG_RAISE }] } : {};
}

/** One medal on a ladder: its medal, its name, and under it the count (the next rung only) or a locked secret's hint. */
function RungCell({ rung, onOpen }: { rung: Rung; onOpen: (key: AchievementKey) => void }) {
  const item = rungItemOf(rung);
  const note = rungNoteOf(rung);

  return (
    <Pressable testID={`achievement-${rung.key}`} onPress={() => onOpen(rung.key)} style={[styles.rung, rungStyleOf(rung)]}>
      <View>
        <Medal definition={item.definition} locked={!item.earned} size={MEDAL_SIZE} />
        {rung.isNextRung && <View style={styles.shadow} />}
      </View>
      <Text style={[styles.name, !item.earned && styles.nameLocked]} numberOfLines={2}>{item.name}</Text>
      {note && <Text testID={`rung-${note.kind}-${rung.key}`} style={styles[note.kind]} numberOfLines={note.kind === 'hint' ? 2 : undefined}>{note.text}</Text>}
    </Pressable>
  );
}

/** One category's ladder: its name and count, then its rungs left to right, scrolling sideways under a fade. */
export function LadderRow({ ladder, onOpen }: { ladder: Ladder; onOpen: (key: AchievementKey) => void }) {
  const { category, rungs } = ladder;

  return (
    <View testID={`ladder-${category}`} style={styles.ladder}>
      <View style={styles.head}>
        <Text testID={`ladder-name-${category}`} style={styles.categoryName}>{celebrationEyebrow({ axis: category })}</Text>
        <Text testID={`ladder-count-${category}`} style={styles.count}>{ladderCountCopy(ladderEarnedOf(ladder), rungs.length)}</Text>
      </View>
      <View style={styles.track}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rungs}>
          {rungs.map(rung => <RungCell key={rung.key} rung={rung} onOpen={onOpen} />)}
        </ScrollView>
        <LinearGradient pointerEvents="none" colors={[FADE_CLEAR, colors.paper]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.fade} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ladder: { gap: 14 },
  head: {
    flexDirection:     'row',
    alignItems:        'baseline',
    justifyContent:    'space-between',
    paddingBottom:     8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryName: { fontFamily: font.extrabold, fontSize: 12, letterSpacing: 0.08 * 12, color: colors.textMuted },
  count:        { fontFamily: font.bold, fontSize: 13, color: colors.textMuted },
  // The raised rung needs room above it.
  track:        { paddingTop: RUNG_RAISE + 1 },
  rungs:        { gap: RUNG_GAP },
  fade:         { position: 'absolute', top: 0, bottom: 0, right: 0, width: FADE_WIDTH },
  rung:         { width: RUNG_WIDTH, alignItems: 'center', gap: 5 },
  shadow: {
    position:        'absolute',
    left:            8,
    right:           8,
    bottom:          -9,
    height:          6,
    borderRadius:    3,
    backgroundColor: colors.textStrong,
    opacity:         0.12,
  },
  name:       { marginTop: 6, fontFamily: font.bold, fontSize: 12.5, lineHeight: 12.5 * 1.2, color: colors.textStrong, textAlign: 'center' },
  nameLocked: { color: colors.textMuted },
  progress:   { fontFamily: font.extrabold, fontSize: 12, color: colors.brand },
  hint:       { fontFamily: font.semibold, fontSize: 11, lineHeight: 11 * 1.25, color: colors.textMuted, textAlign: 'center' },
});
