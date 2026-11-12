import { SvgXml } from 'react-native-svg';
import { wordmarkWhiteSvg } from '@/assets/logo';

interface WordmarkProps {
  height?: number;
  /** The letters' colour: white by default, for the brand background; pass an ink or cobalt for paper. */
  color?: string;
}

/** The SVG's own width and height, read from its `viewBox`, so the box can never drift from the letters. */
export function wordmarkSize(height: number, svg: string = wordmarkWhiteSvg): { width: number; height: number } {
  const match = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
  if (!match) throw new Error('Wordmark SVG has no viewBox starting at 0 0');
  return { width: (height * Number(match[1])) / Number(match[2]), height };
}

/** White "Ascent." wordmark — for use directly on the brand (cobalt) background. */
export function Wordmark({ height = 35, color }: WordmarkProps) {
  const size = wordmarkSize(height);
  const xml = color ? wordmarkWhiteSvg.replace(/#ffffff/gi, color) : wordmarkWhiteSvg;
  return <SvgXml xml={xml} width={size.width} height={size.height} />;
}
