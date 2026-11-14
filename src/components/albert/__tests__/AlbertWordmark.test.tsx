import { render, screen } from '@testing-library/react-native';
import { albertWordmarkCobaltSvg, albertWordmarkInkSvg, albertWordmarkWhiteSvg } from '@/assets/logo';
import { AlbertWordmark, albertWordmarkSvgs } from '../AlbertWordmark';

describe('AlbertWordmark (104)', () => {
  it('each variant is its own approved file, with no <text element', () => {
    expect(albertWordmarkSvgs).toEqual({ white: albertWordmarkWhiteSvg, cobalt: albertWordmarkCobaltSvg, ink: albertWordmarkInkSvg });
    for (const svg of Object.values(albertWordmarkSvgs)) expect(svg).not.toContain('<text');
  });

  it('renders every variant', () => {
    for (const variant of ['white', 'cobalt', 'ink'] as const) {
      render(<AlbertWordmark variant={variant} />);
      expect(screen.getByTestId('albert-wordmark')).toBeTruthy();
      screen.unmount();
    }
  });
});
