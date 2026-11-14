import { SvgXml } from 'react-native-svg';
import { wordmarkCobaltSvg, wordmarkInkSvg, wordmarkWhiteSvg } from '@/assets/logo';

export type WordmarkVariant = 'white' | 'cobalt' | 'ink';

interface WordmarkProps {
  height?: number;
  /** The approved file to use: white on cobalt or dark, cobalt or ink on light. Never recoloured. */
  variant?: WordmarkVariant;
}

export const wordmarkSvgs: Record<WordmarkVariant, string> = {
  white:  wordmarkWhiteSvg,
  cobalt: wordmarkCobaltSvg,
  ink:    wordmarkInkSvg,
};

/** The SVG's own width and height, read from its `viewBox`, so the box can never drift from the letters. */
export function wordmarkSize(height: number, svg: string = wordmarkWhiteSvg): { width: number; height: number } {
  const match = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
  if (!match) throw new Error('Wordmark SVG has no viewBox starting at 0 0');
  return { width: (height * Number(match[1])) / Number(match[2]), height };
}

/** The approved "Ascent." wordmark. White by default, for the brand (cobalt) background. */
export function Wordmark({ height = 35, variant = 'white' }: WordmarkProps) {
  const xml = wordmarkSvgs[variant];
  const size = wordmarkSize(height, xml);
  return <SvgXml xml={xml} width={size.width} height={size.height} />;
}
