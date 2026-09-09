/**
 * SkillNode — sequential track level node — ticket 069 A3.
 *
 * Maps .asc-skillnode (--active / --done / --locked) from the design system.
 * Used in the segmented level progress bar built in A7 (progress.tsx /
 * TrackMap replacement). A3 creates the primitive; A7 composes it.
 *
 * Each node represents one level. States:
 *   done   — completed, full brand fill, full opacity
 *   active — current level, partial fill (driven by `progress` 0–1)
 *   locked — future level, surface-sunken fill, muted label
 *
 * Nodes are laid side by side with `flex: 1` in a flex row so N levels share
 * the full container width equally regardless of label length.
 */
import React from 'react';
import { StyleSheet, Text, View, ViewProps } from 'react-native';
import { colors, font, fontSize, radius, spacing } from '@/theme';

export type SkillNodeState = 'done' | 'active' | 'locked';

interface SkillNodeProps extends ViewProps {
  state: SkillNodeState;
  label: string;
  /** Fill fraction 0–1 for the active node's inner bar. Ignored for done/locked. */
  progress?: number;
}

export function SkillNode({
  state,
  label,
  progress = 0,
  testID,
  style,
  ...rest
}: SkillNodeProps) {
  const filled = state === 'done' ? 1 : state === 'active' ? Math.min(1, Math.max(0, progress)) : 0;

  return (
    <View testID={testID} style={[styles.node, style as object]} {...rest}>
      {/* Bar */}
      <View style={[styles.bar, barTrackStyle(state)]}>
        {filled > 0 && (
          <View
            style={[
              styles.barFill,
              barFillStyle(state),
              { width: `${filled * 100}%` as `${number}%` },
            ]}
          />
        )}
      </View>

      {/* Label */}
      <Text
        style={[styles.label, state === 'locked' && styles.labelLocked]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {label}
      </Text>
    </View>
  );
}

function barTrackStyle(s: SkillNodeState) {
  return s === 'locked' ? styles.barTrackLocked : styles.barTrackDefault;
}

function barFillStyle(s: SkillNodeState) {
  return s === 'done' ? styles.barFillDone : styles.barFillActive;
}

const styles = StyleSheet.create({
  node: {
    flex:    1,
    gap:     spacing.xs,
    alignItems: 'stretch',
  },

  bar: {
    height:       8,
    borderRadius: radius.xs,
    overflow:     'hidden',
  },
  barTrackDefault: {
    backgroundColor: colors.brandSoft,
  },
  barTrackLocked: {
    backgroundColor: colors.surfaceSunken,
  },

  barFill: {
    height:       '100%',
    borderRadius: radius.xs,
  },
  barFillDone: {
    backgroundColor: colors.brand,
  },
  barFillActive: {
    backgroundColor: colors.brand,
    opacity:         0.7,
  },

  label: {
    fontFamily: font.medium,
    fontSize:   fontSize.xs,
    color:      colors.textBody,
    textAlign:  'center',
  },
  labelLocked: {
    color: colors.textSubtle,
  },
});
