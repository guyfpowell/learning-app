import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import type { SkillLevel } from '@learning/shared';
import { colors, font, fontSize, radius, spacing, trackingEm } from '@/theme';

const LEVEL_TAG: Record<SkillLevel, { bg: string; fg: string }> = {
  beginner:     colors.levelBeginner,
  intermediate: colors.levelIntermediate,
  advanced:     colors.levelAdvanced,
  expert:       colors.levelExpert,
};

/** A level's tag: small caps in the level's own colours (the design's tag; `Badge` is the earlier look). */
export function LevelTag({ level, label, testID }: { level: SkillLevel; label?: string; testID?: string }) {
  const { bg, fg } = LEVEL_TAG[level];
  return (
    <View testID={testID} style={[styles.tag, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: fg }]}>{(label ?? level).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag:   { alignSelf: 'flex-start', paddingHorizontal: spacing.sm + 1, paddingVertical: spacing.xs + 1, borderRadius: radius.xs },
  label: { fontFamily: font.extrabold, fontSize: fontSize.xs, letterSpacing: trackingEm.caps * fontSize.xs },
});
