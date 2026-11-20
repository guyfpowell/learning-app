import { HEIGHT_BANDS, type HeightBandKey } from '@learning/shared';
import { colors } from '@/theme';

// Every size is in points at the design's 393-wide frame (`Ascent Home and Height Chart`, C1–C4).

/** The chart, from the top of space (position 1) to sea level (position 0). The four bands take a quarter each. */
export const CHART_HEIGHT = 2560;

/** Canvas above the top of space. */
export const CHART_TOP = 150;

/** The strip under sea level that holds its ruled lines and label. */
export const SEA_LEVEL_STRIP_HEIGHT = 110;

/** Where sea level sits on the canvas. */
export const SEA_LEVEL_Y = CHART_TOP + CHART_HEIGHT;

/** The whole scrolling canvas: space above, the chart, the sea level strip. */
export const CANVAS_HEIGHT = SEA_LEVEL_Y + SEA_LEVEL_STRIP_HEIGHT;

/** One band's height. */
export const BAND_HEIGHT = CHART_HEIGHT / HEIGHT_BANDS.length;

/** The gaps `heightChartLayoutOf` keeps: between two plain rows, and between any pair with the marker or the next landmark's card. */
export const ROW_SPACING = 58;
export const MARKER_SPACING = 66;

/** What a row's and the card's words share: the line height (times the font size), and the gap between the medal and the words. */
export const NAME_LINE_HEIGHT_EM = 1.15;
export const MEDAL_GAP = 12;

/** The rail's centre, and where a leader line ends beside a row. */
export const RAIL_X = 62;
export const LEADER_END_X = 82;

/** The bands, top of space first. */
export const BANDS_TOP_DOWN = [...HEIGHT_BANDS].reverse();

/** Where a chart position (0 to 1, `heightChartPosition`) sits down the canvas. */
export function topOf(position: number): number {
  return canvasYOf((1 - position) * CHART_HEIGHT);
}

/** Where an offset from the top of the chart (`heightChartLayoutOf`) sits down the canvas. */
export function canvasYOf(offset: number): number {
  return CHART_TOP + offset;
}

/** The band whose stretch of the canvas holds `y`: the space above the chart is the top band, the sea level strip the lowest. */
export function bandKeyAtY(y: number): HeightBandKey {
  const index = Math.floor((y - CHART_TOP) / BAND_HEIGHT);
  return BANDS_TOP_DOWN[Math.min(Math.max(index, 0), BANDS_TOP_DOWN.length - 1)].key;
}

/** How far to scroll so the learner's height sits in the middle of the viewport, never past either end. */
export function openingOffsetOf(position: number, viewportHeight: number): number {
  const centred = topOf(position) - viewportHeight / 2;
  return Math.min(Math.max(centred, 0), Math.max(CANVAS_HEIGHT - viewportHeight, 0));
}

/** The colours of what is drawn over a band. */
export interface BandLook {
  onDark: boolean;
  /** The band's name, and the line at its lower edge. */
  name: string;
  boundary: string;
  /** A level's tick, a fifth level's tick and its label. */
  tickShort: string;
  tickLong: string;
  tickLabel: string;
  /** A landmark's leader line, and its rail dot when not passed. */
  leader: string;
  dot: string;
  /** A passed row's name; the detail, and a locked row's name. */
  rowName: string;
  rowMuted: string;
}

/** Ink and white at an alpha: every see-through ink or white the chart draws. */
export const inkAt = (alpha: number) => `rgba(18,21,34,${alpha})`;
export const whiteAt = (alpha: number) => `rgba(255,255,255,${alpha})`;

const ON_LIGHT: BandLook = {
  onDark:    false,
  name:      inkAt(0.4),
  boundary:  inkAt(0.08),
  tickShort: inkAt(0.28),
  tickLong:  inkAt(0.55),
  tickLabel: inkAt(0.62),
  leader:    inkAt(0.22),
  dot:       '#C9C2B4',
  rowName:   colors.textStrong,
  rowMuted:  colors.textMuted,
};

const ON_DARK: BandLook = {
  onDark:    true,
  name:      whiteAt(0.5),
  boundary:  whiteAt(0.14),
  tickShort: whiteAt(0.28),
  tickLong:  whiteAt(0.55),
  tickLabel: whiteAt(0.62),
  leader:    whiteAt(0.35),
  dot:       '#7884B8',
  rowName:   colors.white,
  rowMuted:  whiteAt(0.66),
};

export const BAND_LOOK = {
  'uk-hills': ON_LIGHT,
  mountains:  ON_LIGHT,
  sky:        ON_DARK,
  space:      ON_DARK,
} as const satisfies Record<HeightBandKey, BandLook>;

/** One stop of the chart's background: a colour, and how far down the canvas it sits, 0 (top) to 1 (foot of the sea level strip). */
interface BackgroundStop {
  colour: string;
  at: number;
}

/** The design's one continuous background, top to bottom, measured over the whole canvas (cobalt and paper are the app's own tokens). */
const BACKGROUND_STOPS: readonly [BackgroundStop, BackgroundStop, ...BackgroundStop[]] = [
  { colour: '#04071A',     at: 0 },
  { colour: '#0B1131',     at: 0.1894 },
  { colour: '#0E1846',     at: 0.2695 },
  { colour: '#1A43C4',     at: 0.2908 },
  { colour: colors.brand,  at: 0.3936 },
  { colour: '#2F62E8',     at: 0.4965 },
  { colour: '#D3DFF4',     at: 0.5177 },
  { colour: '#E4EAF3',     at: 0.7234 },
  { colour: colors.paper,  at: 0.7447 },
  { colour: colors.paper,  at: 1 },
];

const [FIRST_STOP, SECOND_STOP, ...OTHER_STOPS] = BACKGROUND_STOPS;

/** The background's colours and where each sits, as `LinearGradient` takes them (it wants two lists; they are built from the one list above). */
export const BACKGROUND_GRADIENT = {
  colours:   [FIRST_STOP.colour, SECOND_STOP.colour, ...OTHER_STOPS.map((stop) => stop.colour)] as const,
  locations: [FIRST_STOP.at, SECOND_STOP.at, ...OTHER_STOPS.map((stop) => stop.at)] as const,
};
