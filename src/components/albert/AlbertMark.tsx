import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { albertMarkCobaltRedSvg, albertMarkWhiteSvg } from '@/assets/logo';

export type AlbertMarkVariant = 'onLight' | 'onBrand';

interface AlbertMarkProps {
  size?: number;
  /** `onLight`: cobalt outline with the red small star. `onBrand`: white outline, for cobalt or dark. */
  variant?: AlbertMarkVariant;
}

export const albertMarkSvgs: Record<AlbertMarkVariant, string> = {
  onLight: albertMarkCobaltRedSvg,
  onBrand: albertMarkWhiteSvg,
};

/** Albert's approved mark. */
export function AlbertMark({ size = 16, variant = 'onLight' }: AlbertMarkProps) {
  return (
    <View testID="albert-mark">
      <SvgXml xml={albertMarkSvgs[variant]} width={size} height={size} />
    </View>
  );
}
