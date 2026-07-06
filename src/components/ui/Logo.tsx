import { SvgXml } from 'react-native-svg';
import { markWhiteOutlineSvg } from '@/assets/logo';

interface LogoProps {
  size?: number;
}

/** White-outline Ascent mark — for use directly on the brand (cobalt) background. */
export function Logo({ size = 64 }: LogoProps) {
  return <SvgXml xml={markWhiteOutlineSvg} width={size} height={size} />;
}
