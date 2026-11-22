import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { ACHIEVEMENTS_HEADING, ACHIEVEMENTS_LOAD_ERROR, medalsEarnedCopy, rungItemOf, type AchievementKey } from '@learning/shared';
import { colors, font, fontSize } from '@/theme';
import { sectionHeadingStyle } from '@/components/ui/sectionHeading';
import { Spinner } from '@/components/ui/Spinner';
import { MedalSheet } from './MedalSheet';
import { TrailheadCard } from '@/components/trailhead/TrailheadCard';
import { LadderRow } from './LadderRow';
import { WeekCard } from '@/components/week/WeekCard';
import { useAchievements } from '@/hooks/useAchievements';

/** One ladder per medal category, with how many medals are earned. Moved from Profile (096). */
export function AchievementsSection() {
  const { data, isLoading, isError } = useAchievements();
  const [selectedKey, setSelectedKey] = useState<AchievementKey | null>(null);

  // A failed refetch keeps the last data, so the error is checked first.
  const achievements = isError ? undefined : data;
  const ladders = achievements?.ladders ?? [];
  const selectedRung = ladders.flatMap(l => l.rungs).find(r => r.key === selectedKey) ?? null;
  const total = achievements?.totalAvailable ?? 0;
  const earnedCount = achievements?.totalUnlocked ?? 0;
  const pct = total > 0 ? (earnedCount / total) * 100 : 0;

  return (
    <View testID="achievements-section" style={styles.section}>
      <View style={styles.head}>
        <Text style={styles.sectionHeading}>{ACHIEVEMENTS_HEADING}</Text>
        {total > 0 && (
          <View style={styles.progress}>
            <View style={styles.bar}>
              <View style={[styles.barFill, { width: `${Math.min(100, pct)}%` }]} />
            </View>
            <Text testID="achievements-count" style={styles.count}>{medalsEarnedCopy(earnedCount, total)}</Text>
          </View>
        )}
      </View>

      {isLoading && <Spinner />}
      {isError && <Text testID="achievements-load-error" style={styles.error}>{ACHIEVEMENTS_LOAD_ERROR}</Text>}

      {achievements && <TrailheadCard trailhead={achievements.trailhead} />}

      {!isLoading && ladders.map(ladder => <LadderRow key={ladder.category} ladder={ladder} onOpen={setSelectedKey} />)}

      <WeekCard />

      {selectedRung && (
        <MedalSheet item={rungItemOf(selectedRung)} celebrating={false} onClose={() => setSelectedKey(null)} />
      )}
    </View>
  );
}

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
  error: { fontFamily: font.regular, fontSize: fontSize.base, color: colors.error },
});
