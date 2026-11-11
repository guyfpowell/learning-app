import { colors, font, fontSize } from '@/theme';
import type { SizeRange } from '@/lib/fitTakeaway';
import { FittedText } from './FittedText';

interface KeyTakeawayBlockProps {
  takeaway: string;
  testID: string;
  /** On the full-colour takeaway page: white, heavy and large, with tight lines. */
  onColour?: boolean;
}

/** The big, heavy takeaway the full-colour page wants: fitted between these sizes. */
const ON_COLOUR_RANGE: SizeRange = { min: fontSize.xl, max: fontSize.xxl };
const ON_COLOUR_LINE_HEIGHT = 1.08;

/** The lesson screen's one thing to remember: large fitted text, no bar and no box (096). */
export function KeyTakeawayBlock({ takeaway, testID, onColour = false }: KeyTakeawayBlockProps) {
  if (onColour) {
    return <FittedText text={takeaway} testID={testID} fontFamily={font.extrabold} color={colors.white} range={ON_COLOUR_RANGE} lineHeight={ON_COLOUR_LINE_HEIGHT} />;
  }
  return <FittedText text={takeaway} testID={testID} fontFamily={font.semibold} />;
}
