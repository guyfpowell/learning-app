import React, { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { HeroBackground } from '@/components/ui/HeroBackground';
import type { SkillLevel } from '@learning/shared';
import { levelCard, radius, shadow, spacing } from '@/theme';

/** The one card of a screen, in its level's colour: a radial gradient from the top right, with contour lines. */
export function LevelHero({ level, children, testID, style, padding = spacing.lg }: {
  level: SkillLevel;
  children: ReactNode;
  testID?: string;
  /** Overrides the card's outer margin (it bleeds 4pt past the page's gutters by default). */
  style?: StyleProp<ViewStyle>;
  padding?: number;
}) {
  return (
    // The shadow sits on the outer view: a view that clips its children would clip it too.
    <View testID={testID} style={[styles.shadow, { backgroundColor: levelCard[level].base }, style]}>
      <View style={styles.clip}>
        <HeroBackground level={level} />
        <View style={[styles.body, { padding }]}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Wider than the page's gutters by 4pt a side: the owner's taste, not the board's.
  shadow: { borderRadius: radius.xl, marginHorizontal: -spacing.xs, ...shadow.brand },
  clip:   { borderRadius: radius.xl, overflow: 'hidden' },
  body:   { gap: spacing.sm3 },
});
