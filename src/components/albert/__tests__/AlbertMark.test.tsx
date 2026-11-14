import { render, screen } from '@testing-library/react-native';
import { albertMarkCobaltRedSvg, albertMarkWhiteSvg } from '@/assets/logo';
import { AlbertMark, albertMarkSvgs } from '../AlbertMark';

describe('AlbertMark (104)', () => {
  it('is cobalt with the red small star on light, and white on brand, with no <text element', () => {
    expect(albertMarkSvgs).toEqual({ onLight: albertMarkCobaltRedSvg, onBrand: albertMarkWhiteSvg });
    for (const svg of Object.values(albertMarkSvgs)) expect(svg).not.toContain('<text');
  });

  it('renders every variant', () => {
    for (const variant of ['onLight', 'onBrand'] as const) {
      render(<AlbertMark variant={variant} size={24} />);
      expect(screen.getByTestId('albert-mark')).toBeTruthy();
      screen.unmount();
    }
  });
});
