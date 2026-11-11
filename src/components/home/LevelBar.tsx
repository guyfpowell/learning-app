import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import type { TrackLevelProgress } from '@learning/shared';
import { levelState } from '@/components/ui/TrackMap';
import { capitalize } from '@/lib/capitalize';
import { colors, font, fontSize, spacing } from '@/theme';

const SEGMENT_HEIGHT = 7;

/** The level being worked on: the one in progress, else the first not finished. */
function currentLevelOf(levels: TrackLevelProgress[]): TrackLevelProgress | undefined {
  return levels.find(l => levelState(l) === 'active') ?? levels.find(l => levelState(l) !== 'done');
}

function fillOf(level: TrackLevelProgress, isCurrent: boolean): number {
  if (levelState(level) === 'done') return 100;
  return isCurrent ? level.percentComplete : 0;
}

/** A path's levels as one segment each, the current one part-filled and named in bold. */
export function LevelBar({ levels }: { levels: TrackLevelProgress[] }) {
  if (levels.length === 0) return null;
  const current = currentLevelOf(levels);
  return (
    <View testID="level-bar" style={styles.row}>
      {levels.map(l => {
        const isCurrent = l === current;
        const fill = fillOf(l, isCurrent);
        return (
          <View key={l.level} testID="track-map-level" style={styles.level}>
            <View style={[styles.track, isCurrent && styles.trackCurrent]}>
              <View style={[styles.fill, { width: `${Math.min(100, Math.max(0, fill))}%` }]} />
            </View>
            <Text style={[styles.label, isCurrent && styles.labelCurrent]} numberOfLines={1}>
              {l.levelLabel ?? capitalize(l.level)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row:          { flexDirection: 'row', gap: spacing.sm },
  level:        { flex: 1, gap: spacing.sm },
  track:        { height: SEGMENT_HEIGHT, borderRadius: SEGMENT_HEIGHT / 2, backgroundColor: colors.borderSubtle, overflow: 'hidden' },
  trackCurrent: { backgroundColor: colors.brandSoft },
  fill:         { height: SEGMENT_HEIGHT, borderRadius: SEGMENT_HEIGHT / 2, backgroundColor: colors.brand },
  label:        { fontFamily: font.medium, fontSize: fontSize.xs + 1, color: colors.textSubtle },
  labelCurrent: { fontFamily: font.extrabold, color: colors.textStrong },
});
