import { colors, results } from '@/theme';
import type { IconName } from '@/components/ui/Icon';

/** The result's colour: the verdict screens wash the whole frame in it (the 2026-11 design). */
export type ResultTone = keyof typeof results;

/** Share of a label's colour kept for a hairline rule (hex alpha, 30%). */
const RULE_ALPHA = '4D';

interface ToneLook {
  /** The verdict eyebrow's word, glyph and tile. */
  word: string;
  glyph: IconName;
  tileBg: string;
  tileFg: string;
  /** Header buttons: translucent over the colour. */
  buttonBg: string;
  statusBar: 'light' | 'dark';
}

export const TONE_LOOK = {
  correct:   { word: 'CORRECT',      glyph: 'check',  tileBg: colors.white,        tileFg: colors.successDark, buttonBg: 'rgba(255,255,255,0.18)', statusBar: 'light' },
  retry:     { word: 'ONE MORE TRY', glyph: 'retake', tileBg: colors.surfaceInverse, tileFg: colors.white,     buttonBg: 'rgba(255,255,255,0.7)',  statusBar: 'dark' },
  incorrect: { word: 'INCORRECT',    glyph: 'close',  tileBg: colors.error,        tileFg: colors.white,       buttonBg: 'rgba(255,255,255,0.12)', statusBar: 'light' },
} as const satisfies Record<ResultTone, ToneLook>;

/** The hairline between a result's sections. */
export function toneRule(tone: ResultTone): string {
  return `${results[tone].tint}${RULE_ALPHA}`;
}
