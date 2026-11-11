import { colors, font } from '@/theme';

/** The Progress page's section heading size (the board's 21pt; not on the type scale). */
const SECTION_HEADING_SIZE = 21;

export const sectionHeadingStyle = {
  fontFamily:    font.black,
  fontSize:      SECTION_HEADING_SIZE,
  letterSpacing: -0.025 * SECTION_HEADING_SIZE,
  color:         colors.textStrong,
} as const;
