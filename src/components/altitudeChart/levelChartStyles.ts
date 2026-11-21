import type { TextStyle, ViewStyle } from 'react-native';
import type { LevelRow, LevelRowState } from '@learning/shared';
import { colors, font } from '@/theme';
import { ALTITUDE_INK, BAND_LOOK, RAIL_X, bandKeyAtY, topOf, type BandLook } from './chartLayout';
import { rowColoursOf } from './chartStyles';

// The functions that compute what the Level view draws, so tests can read the values (design 2b, L1–L3, measured at 393 wide).

type LevelOnly = Extract<LevelRow, { kind: 'level' }>;

/** The look of the band under `y` (down the canvas): a row, strip or tick is coloured for the band it is drawn over, which for a level that straddles two bands is not the one it starts in. */
export function levelLookAt(y: number): BandLook {
  return BAND_LOOK[bandKeyAtY(y)];
}

// ── Strips ───────────────────────────────────────────────────────────────────

const CURRENT_STRIP_FILL = 'rgba(242,181,47,0.2)';
const CURRENT_STRIP_EDGE = 'rgba(201,138,12,0.5)';

/** A level's strip on the scale, from the rail to the right edge, between its start and the next level's start: gold with a line along its top and foot for the learner's level, a faint tint on every other level, and nothing on the rest (null). */
export function levelStripStyleOf(row: LevelOnly): ViewStyle | null {
  const top = topOf(row.strip.to);
  const box: ViewStyle = { position: 'absolute', left: RAIL_X, right: 0, top, height: topOf(row.strip.from) - top };
  if (row.state === 'current') {
    return { ...box, backgroundColor: CURRENT_STRIP_FILL, borderTopWidth: 1, borderBottomWidth: 1, borderColor: CURRENT_STRIP_EDGE };
  }
  return row.level % 2 === 0 ? { ...box, backgroundColor: levelLookAt(top + (topOf(row.strip.from) - top) / 2).levelStrip } : null;
}

// ── Ticks ────────────────────────────────────────────────────────────────────

const TICK_WIDTH = 12;
const TICK_HEIGHT = 1.5;

/** The tick on the rail's left at a level's start, centred on it. */
export function levelTickStyleOf(row: LevelOnly): ViewStyle {
  return {
    position: 'absolute', left: RAIL_X - TICK_WIDTH / 2, width: TICK_WIDTH, height: TICK_HEIGHT,
    top: topOf(row.strip.from) - TICK_HEIGHT / 2, backgroundColor: levelLookAt(topOf(row.strip.from)).levelTick,
  };
}

// ── Rows and axis numbers ────────────────────────────────────────────────────

/** A level's name and range colours: passed in ink, ahead muted, the detail muted either way. The learner's level is the marker, so it has none of its own. */
export function levelRowColoursOf(state: Exclude<LevelRowState, 'current'>, look: BandLook): { name: string; detail: string } {
  return rowColoursOf(state === 'passed' ? 'passed' : 'locked', look);
}

const NUMBER_SIZE = 13;
const NUMBER_LEFT = 4;
const NUMBER_WIDTH = 42;
const PILL_LEFT = 16;
const PILL_HEIGHT = 22;
const PILL_MIN_WIDTH = 28;
const PILL_PADDING = 6;

const NUMBER_TEXT: TextStyle = { fontFamily: font.black, fontSize: NUMBER_SIZE };

/** A level's number on the axis: right-aligned and coloured like its row, or, for the learner's level, in a gold pill (`box`). */
export function axisNumberStyleOf(state: LevelRowState, look: BandLook): { box: ViewStyle | null; text: TextStyle } {
  if (state === 'current') {
    return {
      box: {
        marginLeft: PILL_LEFT, alignSelf: 'flex-start', minWidth: PILL_MIN_WIDTH, height: PILL_HEIGHT, paddingHorizontal: PILL_PADDING,
        borderRadius: PILL_HEIGHT / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.altitude,
        boxShadow: [{ offsetX: 0, offsetY: 2, blurRadius: 0, color: colors.altitudeDark }],
      },
      text: { ...NUMBER_TEXT, color: ALTITUDE_INK },
    };
  }
  return {
    box: null,
    text: { ...NUMBER_TEXT, marginLeft: NUMBER_LEFT, width: NUMBER_WIDTH, textAlign: 'right', color: levelRowColoursOf(state, look).name },
  };
}
