import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { ACHIEVEMENTS_BY_KEY, badgeSlotOf } from '@learning/shared';
import { Text } from '@/components/ui/Text';
import { Medal } from '@/components/ui/Medal';
import { useAltitude } from '@/hooks/useAltitude';
import { colors, font, fontSize, spacing } from '@/theme';
import { Icon } from '@/components/ui/Icon';
import { AltitudeSection } from '@/components/altitude/AltitudeSection';
import { nextStreakCopy, streakStageOf } from '@/lib/momentum';

const FLAME_SIZE = 20;
const SLOT_MEDAL_SIZE = 26;
const SLOT_TEXT_SIZE = 15;

/** Home's top: a line about the streak and the streak itself, then the level, its metres and bar, and the lessons to go with the badge slot beside them. Tapping the level block anywhere opens the Altitude chart. */
export function MomentumCard({ streak }: { streak: number }) {
  // One line per stage, picked when the stage is first shown, so a re-render never changes the words.
  const stage = streakStageOf(streak);
  const copy = useMemo(() => nextStreakCopy(stage), [stage]);
  const { data: altitude, isError } = useAltitude();
  const slot = isError || altitude === undefined ? null : badgeSlotOf(altitude);

  return (
    <View testID="momentum-card" style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.motto}>{copy}</Text>
        <View testID="streak-chip" style={styles.streak} accessibilityLabel={`${streak} day streak`}>
          <Icon name="streak" size={FLAME_SIZE} color={colors.coral} fill={colors.coral} />
          <Text style={styles.streakCount}>{streak}</Text>
        </View>
      </View>

      <AltitudeSection
        screen="home"
        opens="altitude"
        trailing={slot && (
          <View testID="badge-slot" style={styles.slot}>
            <Medal definition={ACHIEVEMENTS_BY_KEY[slot.key]} size={SLOT_MEDAL_SIZE} />
            <Text style={styles.slotText} numberOfLines={1}>{slot.copy}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card:        { gap: spacing.md, marginBottom: spacing.md },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  motto:       { flex: 1, fontFamily: font.bold, fontSize: fontSize.md, color: colors.textMuted },
  slot:        { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  slotText:    { fontFamily: font.bold, fontSize: SLOT_TEXT_SIZE, color: colors.brand },
  streak:      { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  streakCount: { fontFamily: font.extrabold, fontSize: fontSize.md, color: colors.textStrong },
});
