import React from 'react';
import Svg, { ClipPath, Defs, Ellipse, G, LinearGradient, Path, Stop } from 'react-native-svg';
import MEDALS from '@/components/ui/medals.json';
import { medalKeyOf } from '@/lib/medalKey';
import { mixHex } from '@/lib/mixHex';
import { colors, medal } from '@/theme';

/**
 * An achievement medal in the jewel finish: one frame shape per category, one glyph per achievement,
 * a colour per category (gold for the XP milestones), an enamel sheen, and a rim or two by tier.
 * The glyph is centred on the frame's measured visual centre, sized so its largest side is the
 * category's `glyphSize`, using a 60/40 blend of the glyph's bounding-box centre and its ink centroid.
 * All of those numbers are precomputed in `medals.json`.
 */

type Item = (typeof MEDALS)[number]['items'][number];
type Category = (typeof MEDALS)[number];

const BY_KEY: Record<string, { category: Category; item: Item }> = {};
MEDALS.forEach(c => c.items.forEach(item => { BY_KEY[item.key] = { category: c, item }; }));

const JEWEL_BY_CATEGORY: Record<string, string> = medal.jewel;
export const XP_CATEGORY = 'XP milestones';

/** The art's box: 64 wide, 68 tall (the edge sits 4 below the face). */
const VIEW_WIDTH = 64;
const VIEW_HEIGHT = 68;
const EDGE_DROP = 4;

/** The medal's colour: jewel by category, gold for the XP milestones, stone when locked. */
function baseColourOf(category: string, locked: boolean): string {
  if (locked) return medal.locked;
  if (category === XP_CATEGORY) return medal.gold;
  return JEWEL_BY_CATEGORY[category.toLowerCase()] ?? medal.cobalt;
}

function glyphColourOf(xp: boolean, locked: boolean): string {
  if (locked) return medal.lockedGlyph;
  return xp ? medal.xpGlyph : colors.white;
}

let sequence = 0;

/** A medal's category and tier, for the unlock screen's tag: null for a key with no artwork. */
export function medalInfoOf(achievement: string): { category: string; tier: string } | null {
  const entry = BY_KEY[medalKeyOf(achievement)];
  return entry ? { category: entry.category.category, tier: entry.item.tier } : null;
}

/** The medal's colour for a category (jewel by category, gold for the XP milestones). */
export function medalBaseOf(category: string): string {
  return baseColourOf(category, false);
}

/** `achievement` is the app's key ("clean-sheet"). An unknown key draws nothing. */
export function Medal({ achievement, locked = false, size = 64 }: { achievement: string; locked?: boolean; size?: number }) {
  const entry = BY_KEY[medalKeyOf(achievement)];
  if (!entry) return null;
  const { category: c, item: it } = entry;
  const id = `medal${sequence++}`;
  const xp = c.category === XP_CATEGORY;

  const base = baseColourOf(c.category, locked);
  const top = locked ? colors.surfaceSunken : mixHex(base, colors.white, xp ? 0.35 : 0.22);
  const bottom = locked ? medal.lockedBottom : mixHex(base, medal.shade, 0.14);
  const edge = locked ? colors.borderStrong : mixHex(base, medal.shade, xp ? 0.3 : 0.45);
  const glyphColor = glyphColourOf(xp, locked);
  const rim = !locked && it.tier !== 'trail' ? 0.42 : 0;
  const rim2 = !locked && it.tier === 'summit' ? 0.3 : 0;

  const [x0, y0, x1, y1] = it.glyphBox;
  const gx = ((x0 + x1) / 2) * 0.6 + it.glyphCentroid[0] * 0.4;
  const gy = ((y0 + y1) / 2) * 0.6 + it.glyphCentroid[1] * 0.4;
  const s = c.glyphSize / Math.max(x1 - x0, y1 - y0);
  const glyphT = `translate(${c.center[0] - s * gx} ${c.center[1] - s * gy}) scale(${s})`;
  const strokeWidth = 2.45 / s;
  const inset = (k: number) => `translate(32 32) scale(${k}) translate(-32 -32)`;

  return (
    <Svg testID={`medal-${achievement}`} width={size} height={(size * VIEW_HEIGHT) / VIEW_WIDTH} viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}>
      <Defs>
        <LinearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={top} />
          <Stop offset="0.55" stopColor={base} />
          <Stop offset="1" stopColor={bottom} />
        </LinearGradient>
        <ClipPath id={`${id}c`}><Path d={c.frame} /></ClipPath>
      </Defs>
      <Path d={c.frame} fill={edge} stroke={edge} strokeWidth={5} strokeLinejoin="round" transform={`translate(0 ${EDGE_DROP})`} />
      <Path d={c.frame} fill={`url(#${id}g)`} stroke={base} strokeWidth={5} strokeLinejoin="round" />
      {!locked && (
        <>
          <G clipPath={`url(#${id}c)`}>
            <Ellipse cx={20} cy={10} rx={34} ry={17} fill={colors.white} opacity={xp ? 0.22 : 0.14} transform="rotate(-18 20 10)" />
          </G>
          <Path d={c.frame} fill="none" stroke={edge} strokeOpacity={0.28} strokeWidth={1.4} transform={inset(0.9)} />
        </>
      )}
      {rim > 0 && <Path d={c.frame} fill="none" stroke={colors.white} strokeOpacity={rim} strokeWidth={1.6} transform={inset(0.8)} />}
      {rim2 > 0 && <Path d={c.frame} fill="none" stroke={colors.white} strokeOpacity={rim2} strokeWidth={1.2} transform={inset(0.66)} />}
      {!locked && (
        <G transform={`translate(0 1.3) ${glyphT}`} fill="none" stroke={edge} strokeOpacity={0.6} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <Path d={it.glyph} />
        </G>
      )}
      <G transform={glyphT} fill="none" stroke={glyphColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d={it.glyph} />
      </G>
    </Svg>
  );
}
