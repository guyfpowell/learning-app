/**
 * TrackMap — segmented level progress bar — ticket 069 A7.
 *
 * Replaces the previous four-column box layout (which had a 66pt-per-box
 * problem that caused "Intermediate" to wrap and bar sliver readability
 * issues). One row of SkillNode segments at full width, with the active
 * level named beneath.
 *
 * States per level:
 *   done   — percentComplete >= 100
 *   active — completedLessons > 0 and percentComplete < 100
 *   locked — completedLessons === 0
 */
import { View, Text, StyleSheet } from 'react-native';
import { isProgressComplete, type TrackLevelProgress } from '@learning/shared';
import { colors, font, fontSize, spacing } from '@/theme';
import { SkillNode } from '@/components/ui/SkillNode';
import { capitalize } from '@/lib/capitalize';

function levelState(lvl: TrackLevelProgress): 'done' | 'active' | 'locked' {
  if (isProgressComplete(lvl)) return 'done';
  if (lvl.completedLessons > 0) return 'active';
  return 'locked';
}

/** `showStatus` is the "<Level> in progress" line under the strip; Home's hero card turns it off (091d). */
export function TrackMap({ levels, showStatus = true }: { levels: TrackLevelProgress[]; showStatus?: boolean }) {
  if (levels.length === 0) return null;

  const activeLevel = levels.find(
    lvl => lvl.completedLessons > 0 && !isProgressComplete(lvl),
  );
  const activeLevelLabel = activeLevel
    ? (activeLevel.levelLabel ?? capitalize(activeLevel.level))
    : null;

  return (
    <View style={styles.container}>
      <View style={styles.nodes}>
        {levels.map(lvl => {
          const state = levelState(lvl);
          const progress = state === 'active' ? lvl.percentComplete / 100 : 0;
          const label = lvl.levelLabel ?? capitalize(lvl.level);
          return (
            <SkillNode
              key={lvl.level}
              testID="track-map-level"
              state={state}
              label={label}
              progress={progress}
              style={{ flex: 1 }}
            />
          );
        })}
      </View>
      {showStatus && activeLevelLabel && (
        <Text style={styles.activeLabel}>{activeLevelLabel} in progress</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap:       spacing.xs,
    marginTop: spacing.xs,
  },
  nodes: {
    flexDirection: 'row',
    gap:           spacing.xs,
  },
  activeLabel: {
    fontFamily: font.regular,
    fontSize:   fontSize.xs,
    color:      colors.textMuted,
    marginTop:  2,
  },
});
