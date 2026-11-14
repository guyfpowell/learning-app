import { render } from '@testing-library/react-native';
import { wordmarkCobaltSvg, wordmarkInkSvg, wordmarkWhiteSvg } from '@/assets/logo';
import { Wordmark, wordmarkSize, wordmarkSvgs } from '../Wordmark';

const LETTERS_END_X = 168.22;

describe('Wordmark (090)', () => {
  it('crops the viewBox to the letters, with no empty space to their right', () => {
    const width = Number(/viewBox="0 0 ([\d.]+) /.exec(wordmarkWhiteSvg)?.[1]);
    expect(width).toBeGreaterThanOrEqual(LETTERS_END_X);
    expect(width).toBeLessThan(LETTERS_END_X + 2);
  });

  it('sizes the box from the viewBox ratio', () => {
    const svg = '<svg viewBox="0 0 200 50"></svg>';
    expect(wordmarkSize(35, svg)).toEqual({ width: 140, height: 35 });
  });
});

describe('Wordmark variants (104)', () => {
  it('each variant is its own approved file, with no <text element', () => {
    expect(wordmarkSvgs).toEqual({ white: wordmarkWhiteSvg, cobalt: wordmarkCobaltSvg, ink: wordmarkInkSvg });
    for (const svg of Object.values(wordmarkSvgs)) expect(svg).not.toContain('<text');
  });

  it('renders every variant', () => {
    for (const variant of ['white', 'cobalt', 'ink'] as const) {
      const { toJSON, unmount } = render(<Wordmark variant={variant} />);
      expect(toJSON()).not.toBeNull();
      unmount();
    }
  });
});
