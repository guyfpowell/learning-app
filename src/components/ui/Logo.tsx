import { SvgXml } from 'react-native-svg';
import { markCobaltOutlineSvg, markWhiteOutlineSvg } from '@/assets/logo';

export type LogoVariant = 'white' | 'cobalt';

interface LogoProps {
  size?: number;
  /** The approved file to use: white on cobalt or dark, cobalt on light. */
  variant?: LogoVariant;
}

export const markSvgs: Record<LogoVariant, string> = {
  white:  markWhiteOutlineSvg,
  cobalt: markCobaltOutlineSvg,
};

/** The approved Ascent chevron mark. White by default, for the brand (cobalt) background. */
export function Logo({ size = 64, variant = 'white' }: LogoProps) {
  return <SvgXml xml={markSvgs[variant]} width={size} height={size} />;
}
