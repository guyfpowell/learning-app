import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import type { SkillLevel } from '@learning/shared';
import { colors, font, fontSize, levelCard, spacing } from '@/theme';

/** Hex alpha for the current lesson's segment: the level's colour at 40%. */
const CURRENT_ALPHA = '66';

const SEGMENT_HEIGHT = 5;
const SEGMENT_WIDTH = 22;

function segmentColour(position: number, current: number, level: SkillLevel): string {
  const base = levelCard[level].base;
  if (position < current) return base;
  return position === current ? `${base}${CURRENT_ALPHA}` : colors.borderSubtle;
}

/** The header's centre: "Lesson n of m", and one segment per lesson in the topic, lit up to this one in the lesson's level colour. */
export function LessonPositionHeader({ index, total, level }: { index: number; total: number; level: SkillLevel }) {
  return (
    <View testID="lesson-position-header" style={styles.position}>
      <Text style={styles.positionText}>{`Lesson ${index} of ${total}`}</Text>
      <View testID="lesson-position-segments" style={styles.segments}>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={[styles.segment, { backgroundColor: segmentColour(i + 1, index, level) }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  position:     { alignItems: 'center', gap: spacing.xs },
  positionText: { fontFamily: font.bold, fontSize: fontSize.sm, color: colors.textMuted },
  segments:     { flexDirection: 'row', gap: spacing.xs },
  segment:      { width: SEGMENT_WIDTH, height: SEGMENT_HEIGHT, borderRadius: SEGMENT_HEIGHT / 2 },
});
