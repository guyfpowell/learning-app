// The splash animates the approved mark (`learning-design-system/logo-assets/mark-cobalt-outline.svg`) one shape at a
// time, so it needs the shapes apart (owner's OK, ticket 114, for the splash only). Every number is the file's own;
// `splashMark.test.ts` fails if they drift from `markCobaltOutlineSvg`. Nowhere else draws the mark from these.

export const MARK_VIEW_BOX = 200;
export const MARK_COLOUR = '#1c4fd8';

/** The rounded square around the chevrons. */
export const MARK_SQUARE = { x: 6, y: 6, width: 188, height: 188, rx: 58, strokeWidth: 9 } as const;

export const MARK_CHEVRONS = { upper: '68.5,104.5 100,73 131.5,104.5', lower: '68.5,127 100,95.5 131.5,127' } as const;
export const MARK_CHEVRON_STROKE = 13;

const { x, y, width, height, rx } = MARK_SQUARE;
const right = x + width;
const bottom = y + height;

/** The same rounded square as one line from the top's middle, clockwise, so it can be drawn in as a loading bar. */
export const MARK_SQUARE_PATH = [
  `M${x + width / 2} ${y}`,
  `H${right - rx}`,
  `A${rx} ${rx} 0 0 1 ${right} ${y + rx}`,
  `V${bottom - rx}`,
  `A${rx} ${rx} 0 0 1 ${right - rx} ${bottom}`,
  `H${x + rx}`,
  `A${rx} ${rx} 0 0 1 ${x} ${bottom - rx}`,
  `V${y + rx}`,
  `A${rx} ${rx} 0 0 1 ${x + rx} ${y}`,
  'Z',
].join(' ');

/** How long that line is: the four straight sides and the four quarter circles. */
export const MARK_SQUARE_LENGTH = 2 * (width - 2 * rx) + 2 * (height - 2 * rx) + 2 * Math.PI * rx;
