import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { albertWordmarkCobaltSvg, albertWordmarkInkSvg, albertWordmarkWhiteSvg } from '@/assets/logo';
import { wordmarkSize } from '@/components/ui/Wordmark';

export type AlbertWordmarkVariant = 'white' | 'cobalt' | 'ink';

interface AlbertWordmarkProps {
  height?: number;
  /** The approved file to use: white on cobalt or dark, cobalt or ink on light. Never recoloured. */
  variant?: AlbertWordmarkVariant;
}

export const albertWordmarkSvgs: Record<AlbertWordmarkVariant, string> = {
  white:  albertWordmarkWhiteSvg,
  cobalt: albertWordmarkCobaltSvg,
  ink:    albertWordmarkInkSvg,
};

/** The approved "Albert." wordmark. Ink by default, for a light background. */
export function AlbertWordmark({ height = 44, variant = 'ink' }: AlbertWordmarkProps) {
  const xml = albertWordmarkSvgs[variant];
  const size = wordmarkSize(height, xml);
  return (
    <View testID="albert-wordmark" accessible accessibilityRole="image" accessibilityLabel="Albert">
      <SvgXml xml={xml} width={size.width} height={size.height} />
    </View>
  );
}
