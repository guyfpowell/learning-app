import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from '@/components/ui/Text';
import { medalGridOf, type AchievementKey, type MedalGridItem } from '@learning/shared';
import { colors, font, spacing } from '@/theme';
import { sectionHeadingStyle } from '@/components/ui/sectionHeading';
import { Spinner } from '@/components/ui/Spinner';
import { Medal } from '@/components/ui/Medal';
import { MedalSheet } from './MedalSheet';
import { useAchievements } from '@/hooks/useAchievements';

/** Every achievement, earned ones lit and locked ones dim, with how many are earned. Moved from Profile (096). */
export function AchievementsSection() {
  const { data: achievements, isLoading } = useAchievements();
  const [selectedKey, setSelectedKey] = useState<AchievementKey | null>(null);

  const all = achievements ? medalGridOf(achievements) : [];
  const selectedItem = selectedKey ? (all.find(a => a.key === selectedKey) ?? null) : null;

  const earned = all.filter(a => a.earned);
  const toEarn = all.filter(a => !a.earned);
  const total = achievements?.totalAvailable ?? all.length;
  const earnedCount = achievements?.totalUnlocked ?? earned.length;
  const pct = total > 0 ? (earnedCount / total) * 100 : 0;

  return (
    <View testID="achievements-section" style={styles.section}>
      <View style={styles.head}>
        <Text style={styles.sectionHeading}>Achievements</Text>
        {total > 0 && (
          <View style={styles.progress}>
            <View style={styles.bar}>
              <View style={[styles.barFill, { width: `${Math.min(100, pct)}%` }]} />
            </View>
            <Text testID="achievements-count" style={styles.count}>
              {earnedCount} of {total} earned · tap any to see how to earn it
            </Text>
          </View>
        )}
      </View>

      {isLoading && <Spinner />}

      {!isLoading && earned.length > 0 && <MedalGrid label="EARNED" items={earned} onOpen={setSelectedKey} />}
      {!isLoading && toEarn.length > 0 && <MedalGrid label="STILL TO EARN" items={toEarn} onOpen={setSelectedKey} />}

      {selectedKey && selectedItem && (
        <MedalSheet item={selectedItem} celebrating={false} onClose={() => setSelectedKey(null)} />
      )}
    </View>
  );
}

/** A labelled grid of medals, four to a row. */
function MedalGrid({ label, items, onOpen }: { label: string; items: MedalGridItem[]; onOpen: (key: AchievementKey) => void }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.achievementGrid}>
        {items.map(a => (
          <Pressable key={a.key} testID={`achievement-${a.key}`} onPress={() => onOpen(a.key)} style={styles.achievement}>
            <Medal definition={a.definition} locked={!a.earned} size={MEDAL_SIZE} />
            <Text style={[styles.achievementName, !a.earned && styles.achievementLocked]} numberOfLines={2}>{a.name}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const GRID_COLS = 4;
const MEDAL_SIZE = 62;

const styles = StyleSheet.create({
  section: { gap: 22 },
  head:    { gap: 10 },
  sectionHeading: sectionHeadingStyle,
  progress: { gap: 7 },
  bar:      { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  barFill:  { height: 6, borderRadius: 3, backgroundColor: colors.textStrong },
  count: {
    fontFamily: font.bold,
    fontSize:   13,
    color:      colors.textBody,
  },
  group: { gap: 14 },
  groupLabel: {
    paddingBottom:     8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    fontFamily:        font.extrabold,
    fontSize:          12,
    letterSpacing:     0.08 * 12,
    color:             colors.textMuted,
  },

  // Achievements: medals on the page, four to a row
  achievementGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    rowGap:        18,
  },
  achievement: {
    width:             `${100 / GRID_COLS}%`,
    paddingHorizontal: spacing.xs,
    alignItems:        'center',
    gap:               6,
  },
  achievementName: {
    fontFamily: font.bold,
    fontSize:   12,
    lineHeight: 12 * 1.2,
    color:      colors.textStrong,
    textAlign:  'center',
  },
  achievementLocked: { color: colors.textMuted },
});
