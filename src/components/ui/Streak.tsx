/**
 * Streak — ticket 069 A3.
 *
 * Flame SVG path lifted directly from ui_kits/mobile/mobile.jsx:
 *   const Flame = () => <svg viewBox="0 0 24 24" fill="currentColor">
 *     <path d="M12 2c1 3-1 4-2 6-1 2 0 4 2 4 1.5 0 2-1.2 2-2
 *              2 1.5 3 3.5 3 5.5A6.5 6.5 0 1 1 6.5 14C6.5 9 11 7 12 2z" />
 *   </svg>;
 *
 * Two exports:
 *   - FlameIcon — standalone SVG, replaces emoji text in stat rows
 *   - Streak   — .asc-streak chip (flame + count), used in header chips
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, font, fontSize, radius, spacing } from '@/theme';

const FLAME_PATH =
  'M12 2c1 3-1 4-2 6-1 2 0 4 2 4 1.5 0 2-1.2 2-2 2 1.5 3 3.5 3 5.5A6.5 6.5 0 1 1 6.5 14C6.5 9 11 7 12 2z';

// ── FlameIcon ────────────────────────────────────────────────────────────────

interface FlameIconProps {
  size?: number;
  color?: string;
}

/** Standalone SVG flame — drop-in replacement for the 🔥 emoji in stat rows. */
export function FlameIcon({ size = 22, color = colors.coral }: FlameIconProps) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill={color}>
      <Path d={FLAME_PATH} />
    </Svg>
  );
}

// ── Streak ───────────────────────────────────────────────────────────────────

interface StreakProps {
  count: number;
  /** sm — compact header chip; md — card-level display */
  size?: 'sm' | 'md';
}

/**
 * asc-streak chip — flame icon + count, used in lesson headers and quiz results.
 * Coral accent background, matching the design system streak component.
 */
export function Streak({ count, size = 'md' }: StreakProps) {
  const isSm = size === 'sm';
  return (
    <View style={[styles.chip, isSm && styles.chipSm]}>
      <FlameIcon size={isSm ? 14 : 18} color={colors.coral} />
      <Text style={[styles.count, isSm && styles.countSm]}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing.xs,
    backgroundColor: colors.coralSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical:   spacing.xs,
    borderRadius:    radius.pill,
  },
  chipSm: {
    paddingHorizontal: 6,
    paddingVertical:   3,
  },
  count: {
    fontFamily: font.semibold,
    fontSize:   fontSize.base,
    color:      colors.coralDark,
  },
  countSm: {
    fontSize: fontSize.sm,
  },
});
