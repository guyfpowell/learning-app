import type { TextStyle, ViewStyle } from 'react-native';
import type { LandmarkRow, LevelTick } from '@learning/shared';
import { heightBandOf } from '@learning/shared';
import { colors, font } from '@/theme';
import {
  BANDS_TOP_DOWN,
  BAND_HEIGHT,
  BAND_LOOK,
  CHART_TOP,
  LEADER_END_X,
  RAIL_X,
  SEA_LEVEL_Y,
  bandKeyAtY,
  inkAt,
  topOf,
  whiteAt,
  type BandLook,
} from './chartLayout';

// The functions that compute what the chart draws, so tests can read the values (`toHaveStyle` isn't installed).

/** The height of the strip a row, the card or the marker is centred in. It is taller than any of them, so each is centred on its offset whatever its own height. */
export const SLOT_HEIGHT = 120;

/** A slot centred on `y`; it passes touches through to what it holds. */
export function slotTopOf(y: number): number {
  return y - SLOT_HEIGHT / 2;
}

export function slotStyleOf(y: number): ViewStyle {
  return { position: 'absolute', left: 0, right: 0, top: slotTopOf(y), height: SLOT_HEIGHT, justifyContent: 'center' };
}

// ── Bands ────────────────────────────────────────────────────────────────────

const BAND_NAME_SIZE = 10.5;
const BAND_NAME_TRACKING_EM = 0.14;
const BAND_NAME_BOX = { width: 240, height: 20 };
/** The centre line of the rotated band names, from the right edge. */
const BAND_NAME_CENTRE_X = 369;

/** The box a band's name is centred in, turned 90 degrees, centred on the band (`index`: 0 is the top band). */
export function bandNameSlotOf(index: number): ViewStyle {
  const centre = CHART_TOP + index * BAND_HEIGHT + BAND_HEIGHT / 2;
  return {
    position:       'absolute',
    left:           BAND_NAME_CENTRE_X - BAND_NAME_BOX.width / 2,
    top:            centre - BAND_NAME_BOX.height / 2,
    ...BAND_NAME_BOX,
    alignItems:     'center',
    justifyContent: 'center',
    transform:      [{ rotate: '90deg' }],
  };
}

export function bandNameStyleOf(look: BandLook): TextStyle {
  return {
    fontFamily:    font.extrabold,
    fontSize:      BAND_NAME_SIZE,
    letterSpacing: BAND_NAME_SIZE * BAND_NAME_TRACKING_EM,
    color:         look.name,
  };
}

/** The 1pt line on the boundary under band `index` (0 is the top band), from the rail to the right edge, coloured by the band above it. */
export function bandBoundaryStyleOf(index: number): ViewStyle {
  return {
    position:        'absolute',
    top:             CHART_TOP + (index + 1) * BAND_HEIGHT,
    left:            RAIL_X,
    right:           0,
    height:          1,
    backgroundColor: BAND_LOOK[BANDS_TOP_DOWN[index].key].boundary,
  };
}

// ── The rail ─────────────────────────────────────────────────────────────────

const RAIL_WIDTH = 3;
const GOLD_RAIL_WIDTH = 4;
const RAIL_OVERHANG = 40;
const LEARNER_DOT_SIZE = 16;
const LEARNER_DOT_RING = 4;
const LIGHT_BAND_COUNT = 2;

export interface RailStyles {
  base: ViewStyle;
  lightBands: ViewStyle;
  gold: ViewStyle;
  dot: ViewStyle;
}

/** The rail: white from 40 above the chart to sea level, ink over the two light bands, gold from the learner (`markerY`) to sea level, and the gold dot with its soft ring. */
export function railStylesOf(markerY: number): RailStyles {
  const top = CHART_TOP - RAIL_OVERHANG;
  const lightTop = CHART_TOP + (BANDS_TOP_DOWN.length - LIGHT_BAND_COUNT) * BAND_HEIGHT;
  return {
    base: {
      position: 'absolute', left: RAIL_X - RAIL_WIDTH / 2, width: RAIL_WIDTH, top, height: SEA_LEVEL_Y - top,
      borderRadius: 2, backgroundColor: whiteAt(0.18),
    },
    lightBands: {
      position: 'absolute', left: RAIL_X - RAIL_WIDTH / 2, width: RAIL_WIDTH, top: lightTop, height: SEA_LEVEL_Y - lightTop,
      backgroundColor: inkAt(0.1),
    },
    gold: {
      position: 'absolute', left: RAIL_X - GOLD_RAIL_WIDTH / 2, width: GOLD_RAIL_WIDTH, top: markerY, height: SEA_LEVEL_Y - markerY,
      borderRadius: 2, backgroundColor: colors.altitude,
    },
    dot: {
      position: 'absolute', left: RAIL_X - LEARNER_DOT_SIZE / 2, width: LEARNER_DOT_SIZE, height: LEARNER_DOT_SIZE,
      top: markerY - LEARNER_DOT_SIZE / 2, borderRadius: LEARNER_DOT_SIZE / 2, backgroundColor: colors.altitude,
      boxShadow: [{ offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: LEARNER_DOT_RING, color: 'rgba(242,181,47,0.3)' }],
    },
  };
}

// ── Ticks ────────────────────────────────────────────────────────────────────

const TICK_HEIGHT = 1.5;
const TICK_SHORT_WIDTH = 6;
const TICK_LONG_WIDTH = 10;
const TICK_LABEL_LEFT = 8;
const TICK_LABEL_WIDTH = 46;
const TICK_LABEL_SIZE = 11;
const TICK_LABEL_RISE = 8;

export interface TickStyles {
  line: ViewStyle;
  /** Only a labelled (every fifth) level has one. */
  label: TextStyle | null;
}

/** A level's tick on the rail's left, in the tones of the band it sits in; a labelled one is longer and has its label right-aligned to its left. */
export function tickStyleOf(tick: LevelTick): TickStyles {
  const look = BAND_LOOK[heightBandOf(tick.metres).key];
  const top = topOf(tick.position);
  const long = tick.label !== null;
  const width = long ? TICK_LONG_WIDTH : TICK_SHORT_WIDTH;
  return {
    line: { position: 'absolute', left: RAIL_X - width, top, width, height: TICK_HEIGHT, backgroundColor: long ? look.tickLong : look.tickShort },
    label: long
      ? {
        position: 'absolute', left: TICK_LABEL_LEFT, width: TICK_LABEL_WIDTH, top: top - TICK_LABEL_RISE, textAlign: 'right',
        fontFamily: font.extrabold, fontSize: TICK_LABEL_SIZE, color: look.tickLabel,
      }
      : null,
  };
}

// ── Leader lines and rail dots ───────────────────────────────────────────────

const LEADER_PAD = 2;
const DOT_SIZE = 6.4;

/** The small box a leader line is drawn in, and its ends inside it. `left` and `top` are on the canvas. */
export interface LeaderBox {
  left: number;
  top: number;
  width: number;
  height: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** A leader line from the rail at the true height (`trueY`) to the row's shown centre (`shownY`), level when the row was not moved. */
export function leaderBoxOf(trueY: number, shownY: number): LeaderBox {
  const top = Math.min(trueY, shownY) - LEADER_PAD;
  return {
    left:   RAIL_X - LEADER_PAD,
    top,
    width:  LEADER_END_X - RAIL_X + 2 * LEADER_PAD,
    height: Math.abs(shownY - trueY) + 2 * LEADER_PAD,
    x1:     LEADER_PAD,
    y1:     trueY - top,
    x2:     LEADER_PAD + LEADER_END_X - RAIL_X,
    y2:     shownY - top,
  };
}

/** A landmark's dot on the rail at its true height: gold when passed, otherwise the band's grey or blue-grey. */
export function dotStyleOf(trueY: number, state: LandmarkRow['state'], look: BandLook): ViewStyle {
  return {
    position:        'absolute',
    left:            RAIL_X - DOT_SIZE / 2,
    top:             trueY - DOT_SIZE / 2,
    width:           DOT_SIZE,
    height:          DOT_SIZE,
    borderRadius:    DOT_SIZE / 2,
    backgroundColor: state === 'passed' ? colors.altitude : look.dot,
  };
}

/** A plain row's name and detail colours: passed is the band's ink (white on dark) with a muted detail; locked is muted throughout. */
export function rowColoursOf(state: Exclude<LandmarkRow['state'], 'next'>, look: BandLook): { name: string; detail: string } {
  return { name: state === 'passed' ? look.rowName : look.rowMuted, detail: look.rowMuted };
}

// ── The header ───────────────────────────────────────────────────────────────

const paperAt = (alpha: number) => `rgba(243,241,236,${alpha})`;
const navyAt = (alpha: number) => `rgba(5,8,28,${alpha})`;

/** The back and title row is 44 tall, 4 below the status bar; the fade reaches 64 below the status bar (118 at the design's 54). */
export const HEADER_ROW_TOP = 4;
export const HEADER_ROW_HEIGHT = 44;
const HEADER_FADE_BELOW_INSET = 64;

export function headerFadeHeightOf(topInset: number): number {
  return topInset + HEADER_FADE_BELOW_INSET;
}

/** The canvas height under the header's row when the chart is scrolled to `scrollY`: the point whose band sets the header's look. */
export function headerSampleYOf(scrollY: number, topInset: number): number {
  return scrollY + topInset + HEADER_ROW_TOP + HEADER_ROW_HEIGHT / 2;
}

export interface HeaderLook {
  onDark: boolean;
  /** The fade's solid colour, and the same colour clear. */
  fade: string;
  fadeClear: string;
  /** The back chevron and the title. */
  ink: string;
}

const HEADER_ON_DARK: HeaderLook = { onDark: true, fade: navyAt(0.95), fadeClear: navyAt(0), ink: colors.white };
const HEADER_ON_LIGHT: HeaderLook = { onDark: false, fade: paperAt(0.97), fadeClear: paperAt(0), ink: colors.textStrong };

/** The header over a dark or a light band: navy at 0.95 with white on a dark one, paper at 0.97 with ink on a light one. */
export function headerLookFor(onDark: boolean): HeaderLook {
  return onDark ? HEADER_ON_DARK : HEADER_ON_LIGHT;
}

/** The header over the band under it; `y` is the canvas height under the header. */
export function headerLookOf(y: number): HeaderLook {
  return headerLookFor(BAND_LOOK[bandKeyAtY(y)].onDark);
}
