import { Pressable, StyleSheet, View } from 'react-native';
import { ACHIEVEMENTS_BY_KEY, type WeekRow, type WeekRowSheet } from '@learning/shared';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { Medal } from '@/components/ui/Medal';
import { TrailheadStepIcon } from '@/components/trailhead/TrailheadStepIcon';
import { colors, font } from '@/theme';

const MEDAL_SIZE = 40;
const CHEVRON_SIZE = 18;

/** One row of the week: the medal (a Trailhead step shows its step icon), the name and the line. A tap opens its sheet. */
export function WeekRowView({ row, onOpen }: { row: WeekRow; onOpen: (sheet: WeekRowSheet) => void }) {
  return (
    <Pressable testID={`week-row-${row.key}`} onPress={() => onOpen(row.sheet)} accessibilityRole="button" style={styles.row}>
      <View style={styles.art}>
        {row.kind === 'trailhead-step'
          ? <TrailheadStepIcon stepKey={row.key} state="done" />
          : <Medal definition={ACHIEVEMENTS_BY_KEY[row.key]} size={MEDAL_SIZE} />}
      </View>
      <View style={styles.words}>
        <Text style={styles.name}>{row.name}</Text>
        <Text testID={`week-row-line-${row.key}`} style={styles.line}>{row.line}</Text>
      </View>
      <Icon name="forward" size={CHEVRON_SIZE} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  art:   { width: 46, alignItems: 'center' },
  words: { flex: 1, gap: 2 },
  name:  { fontFamily: font.extrabold, fontSize: 17, color: colors.textStrong },
  line:  { fontFamily: font.regular, fontSize: 14, color: colors.textMuted },
});
