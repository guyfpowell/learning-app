import React from 'react';
import Svg, { ClipPath, Defs, Ellipse, G, LinearGradient, Path, Stop } from 'react-native-svg';
import { glyphPlacementOf, medalDrawingOf, type MedalDefinition, type MedalRim } from '@learning/shared';
import { colors } from '@/theme';

/**
 * An achievement medal in the jewel finish, drawn from the shared art: one frame shape per category,
 * one glyph per medal, the art's jewel colour, an enamel sheen, and the tier's rims and sparkles.
 * What to draw, and where the glyph goes, is decided by shared `medalDrawingOf` and `glyphPlacementOf`; this draws it.
 */

/** The art's box: 64 wide, 68 tall (the edge sits 4 below the face). */
const VIEW_WIDTH = 64;
const VIEW_HEIGHT = 68;
const EDGE_DROP = 4;

let sequence = 0;

const inset = (k: number, dy = 0) => `translate(0 ${dy}) translate(32 32) scale(${k}) translate(-32 -32)`;

function Rim({ rim }: { rim: MedalRim }) {
  return (
    <>
      {rim.shadow && (
        <Path d={rim.d} fill="none" stroke={rim.shadow.stroke} strokeOpacity={rim.shadow.opacity} strokeWidth={rim.shadow.width} transform={inset(rim.scale, rim.shadow.dy)} />
      )}
      <Path d={rim.d} fill="none" stroke={rim.stroke} strokeWidth={rim.width} transform={inset(rim.scale)} />
    </>
  );
}

/** An unknown key and a Trailhead step draw nothing. */
export function Medal({ definition, locked = false, size = 64 }: { definition: MedalDefinition; locked?: boolean; size?: number }) {
  const drawing = medalDrawingOf(definition, locked);
  if (!drawing) return null;
  const { art, glyph, base, top, bottom, edge, glyphColor, sheenOpacity, rims, sparkles } = drawing;
  const id = `medal${sequence++}`;
  const { transform: glyphT, strokeWidth } = glyphPlacementOf(drawing);

  return (
    <Svg testID={`medal-${definition.key}`} width={size} height={(size * VIEW_HEIGHT) / VIEW_WIDTH} viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}>
      <Defs>
        <LinearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={top} />
          <Stop offset="0.55" stopColor={base} />
          <Stop offset="1" stopColor={bottom} />
        </LinearGradient>
        <ClipPath id={`${id}c`}><Path d={art.frame} /></ClipPath>
      </Defs>
      <Path d={art.frame} fill={edge} stroke={edge} strokeWidth={5} strokeLinejoin="round" transform={`translate(0 ${EDGE_DROP})`} />
      <Path d={art.frame} fill={`url(#${id}g)`} stroke={base} strokeWidth={5} strokeLinejoin="round" />
      {!locked && (
        <>
          <G clipPath={`url(#${id}c)`}>
            <Ellipse cx={20} cy={10} rx={34} ry={17} fill={colors.white} opacity={sheenOpacity} transform="rotate(-18 20 10)" />
          </G>
          <Path d={art.frame} fill="none" stroke={edge} strokeOpacity={0.28} strokeWidth={1.4} transform={inset(0.9)} />
        </>
      )}
      {rims.map(rim => <Rim key={rim.name} rim={rim} />)}
      {!locked && (
        <G transform={`translate(0 1.3) ${glyphT}`} fill="none" stroke={edge} strokeOpacity={0.6} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <Path d={glyph.glyph} />
        </G>
      )}
      <G transform={glyphT} fill="none" stroke={glyphColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d={glyph.glyph} />
      </G>
      {sparkles && sparkles.paths.map(d => <Path key={d} d={d} fill={sparkles.fill} stroke={sparkles.stroke} strokeWidth={sparkles.width} strokeLinejoin="round" />)}
    </Svg>
  );
}
