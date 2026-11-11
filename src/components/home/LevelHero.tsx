import React, { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { HeroBackground } from '@/components/ui/HeroBackground';
import type { SkillLevel } from '@learning/shared';
import { levelCard, radius, shadow, spacing } from '@/theme';

/** The one card of a screen, in its level's colour: a radial gradient from the top right, with contour lines. */
export function LevelHero({ level, children, testID }: { level: SkillLevel; children: ReactNode; testID?: string }) {
  return (
    // The shadow sits on the outer view: a view that clips its children would clip it too.
    <View testID={testID} style={[styles.shadow, { backgroundColor: levelCard[level].base }]}>
      <View style={styles.clip}>
        <HeroBackground level={level} />
        <View style={styles.body}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: { borderRadius: radius.xl, ...shadow.brand },
  clip:   { borderRadius: radius.xl, overflow: 'hidden' },
  body:   { padding: spacing.lg, gap: spacing.sm3 },
});
