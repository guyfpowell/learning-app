import { SvgXml } from 'react-native-svg';
import { wordmarkWhiteSvg } from '@/assets/logo';

interface WordmarkProps {
  width?: number;
  height?: number;
}

/** White "Ascent." wordmark — for use directly on the brand (cobalt) background. */
export function Wordmark({ width = 150, height = 35 }: WordmarkProps) {
  return <SvgXml xml={wordmarkWhiteSvg} width={width} height={height} />;
}
