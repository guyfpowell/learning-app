import { View, Text, StyleSheet } from 'react-native';
import type { TrackLevelProgress } from '@learning/shared';
import { colors, font, fontSize, spacing } from '@/theme';

function ProgressBar({ value }: { value: number }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${clamped}%` as `${number}%` }]} />
    </View>
  );
}

export function TrackMap({
  levels,
  currentLevel,
}: {
  levels: TrackLevelProgress[];
  currentLevel?: string;
}) {
  if (levels.length === 0) return null;
  return (
    <View style={styles.container}>
      {levels.map(lvl => {
        const pct =
          lvl.completedLessons > 0 ? Math.max(1, Math.round(lvl.percentComplete)) : 0;
        const isActive = currentLevel === lvl.level;
        const label = lvl.levelLabel ?? (lvl.level.charAt(0).toUpperCase() + lvl.level.slice(1));
        return (
          <View
            key={lvl.level}
            testID="track-map-level"
            style={[styles.level, isActive && styles.levelActive]}
          >
            <Text style={[styles.levelLabel, isActive && styles.levelLabelActive]}>
              {label}
            </Text>
            <ProgressBar value={pct} />
            <Text style={styles.count}>
              {lvl.completedLessons}/{lvl.totalLessons}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap:           spacing.xs,
    marginTop:     spacing.xs,
  },
  level: {
    flex:            1,
    padding:         spacing.xs,
    borderRadius:    6,
    backgroundColor: colors.border,
  },
  levelActive: {
    backgroundColor: colors.brandSoft,
    borderWidth:     1,
    borderColor:     colors.brand + '60',
  },
  levelLabel: {
    fontFamily:   font.medium,
    fontSize:     fontSize.xs,
    color:        colors.textMuted,
    marginBottom: 2,
  },
  levelLabelActive: {
    color: colors.brand,
  },
  count: {
    fontFamily: font.regular,
    fontSize:   fontSize.xs,
    color:      colors.textMuted,
    marginTop:  2,
  },
  progressTrack: {
    height:          6,
    backgroundColor: colors.border,
    borderRadius:    3,
    overflow:        'hidden',
  },
  progressFill: {
    height:          6,
    backgroundColor: colors.teal,
    borderRadius:    3,
  },
});
