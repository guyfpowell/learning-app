import { StyleSheet, Text, View } from 'react-native';
import type { SkillLevel } from '@learning/shared';
import { colors, font, fontSize, radius, shadow, spacing, tracking } from '@/theme';
import { Badge, LEVEL_BADGE_VARIANT } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';

export interface LessonPathHeaderProps {
  level?: SkillLevel;
  levelLabel?: string | null;
  topicName?: string | null;
  lessonIndex?: number | null;
  totalLessons?: number | null;
  /** The enrolment the lesson sits in; absent when the learner is not on its track. */
  path?: { name: string; percentComplete: number };
}

/** The lesson screen's path header: where this lesson sits, read at a glance. */
export function LessonPathHeader({ level, levelLabel, topicName, lessonIndex, totalLessons, path }: LessonPathHeaderProps) {
  if (!level && !topicName && !path) return null;

  const position = topicName && lessonIndex != null && totalLessons != null && totalLessons > 0
    ? { index: lessonIndex, total: totalLessons }
    : null;

  const badge = level ? <Badge label={levelLabel ?? level} variant={LEVEL_BADGE_VARIANT[level]} /> : null;

  return (
    <View testID="track-header" style={styles.card}>
      {/* With a position line the badge goes on its right; otherwise it stays here. */}
      {(topicName || (badge && !position)) && (
        <View style={styles.eyebrowRow}>
          {!position && badge}
          {topicName && <Text style={styles.eyebrow} numberOfLines={1}>{topicName}</Text>}
        </View>
      )}
      {position && (
        <View testID="lesson-position-block" style={styles.positionBlock}>
          <View testID="lesson-position-row" style={styles.positionRow}>
            <Text style={styles.position}>{`Lesson ${position.index} of ${position.total}`}</Text>
            {badge}
          </View>
          <Progress testID="lesson-position-progress" value={(position.index / position.total) * 100} />
        </View>
      )}
      {path && (
        <View style={styles.pathRow}>
          <Text style={styles.quiet} numberOfLines={1}>{path.name}</Text>
          <Text style={styles.quiet}>{`${path.percentComplete}% complete`}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.borderSubtle,
    borderRadius:    radius.card,
    padding:         spacing.md,
    gap:             spacing.sm,
    marginBottom:    spacing.md,
    ...shadow.xs,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
  },
  eyebrow: {
    flex:          1,
    fontFamily:    font.bold,
    fontSize:      fontSize.xs,
    letterSpacing: tracking.caps,
    textTransform: 'uppercase',
    color:         colors.textMuted,
  },
  positionBlock: { gap: spacing.sm },
  positionRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    gap:            spacing.sm,
  },
  position: {
    fontFamily: font.semibold,
    fontSize:   fontSize.base,
    color:      colors.textStrong,
  },
  pathRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    gap:            spacing.sm,
  },
  quiet: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
    flexShrink: 1,
  },
});
