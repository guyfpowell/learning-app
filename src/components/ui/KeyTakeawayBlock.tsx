import { font } from '@/theme';
import { FittedText } from './FittedText';

interface KeyTakeawayBlockProps {
  takeaway: string;
  testID: string;
}

/** The lesson screen's one thing to remember: large fitted text on the page, no bar, no box, no label (096). The header says "Key takeaway". */
export function KeyTakeawayBlock({ takeaway, testID }: KeyTakeawayBlockProps) {
  return <FittedText text={takeaway} testID={testID} fontFamily={font.semibold} />;
}
