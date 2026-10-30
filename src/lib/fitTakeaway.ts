import { fontSize } from '@/theme';

/** The key takeaway's default size, and the range it may move within to fill its last line (096). */
export const TAKEAWAY_DEFAULT_SIZE = fontSize.lg;
export const TAKEAWAY_MAX_SIZE = fontSize.lg + 2;
export const TAKEAWAY_MIN_SIZE = fontSize.md;
export const TAKEAWAY_RANGE: SizeRange = { min: TAKEAWAY_MIN_SIZE, max: TAKEAWAY_MAX_SIZE };
export const TAKEAWAY_STEP = 0.5;
/** The takeaway may take up to this share of the window's height (096). */
export const TAKEAWAY_MAX_PAGE_SHARE = 0.5;
/** The last line counts as "ending at the end of a line" when it fills this share of the width (096). */
export const TAKEAWAY_LAST_LINE_FILL = 0.92;
export const TAKEAWAY_LINE_HEIGHT = 1.35;

/** The sizes a block of fitted text may move within; the quiz question has its own (096). */
export interface SizeRange {
  min: number;
  max: number;
}

export interface LineMetric {
  width: number;
  height: number;
}

/** The size tried so far whose last line was fullest. */
export interface BestFit {
  size: number;
  fill: number;
}

export interface TakeawayFit {
  size: number;
  settled: boolean;
  best?: BestFit;
}

function isBetter(fill: number, size: number, best?: BestFit): boolean {
  if (!best || fill > best.fill) return true;
  // A tie goes to the size nearer the default.
  return fill === best.fill && Math.abs(size - TAKEAWAY_DEFAULT_SIZE) < Math.abs(best.size - TAKEAWAY_DEFAULT_SIZE);
}

/**
 * One step of fitting the takeaway: given how it laid out at `size`, accept it or try a half point smaller.
 * It starts at the largest size and steps down, taking the first size that fits the height budget and
 * ends on a nearly full last line. The last line's width jumps as words reflow (it grows with size until
 * a word wraps, then drops), so there is no formula and no binary search. When no size reaches the
 * target, it settles on the size whose last line was fullest, within the height budget.
 */
export function nextTakeawayFit(
  lines: LineMetric[],
  size: number,
  width: number,
  maxHeight: number,
  best?: BestFit,
  range: SizeRange = TAKEAWAY_RANGE,
): TakeawayFit {
  if (lines.length === 0 || width <= 0) return { size: TAKEAWAY_DEFAULT_SIZE, settled: true };
  const height = lines.reduce((sum, line) => sum + line.height, 0);
  const fill = lines[lines.length - 1].width / width;
  const fitsHeight = height <= maxHeight;
  if (fitsHeight && fill >= TAKEAWAY_LAST_LINE_FILL) return { size, settled: true };

  const newBest = fitsHeight && isBetter(fill, size, best) ? { size, fill } : best;
  const smaller = size - TAKEAWAY_STEP;
  if (smaller < range.min) return { size: newBest?.size ?? TAKEAWAY_DEFAULT_SIZE, settled: true, best: newBest };
  return { size: smaller, settled: false, best: newBest };
}
