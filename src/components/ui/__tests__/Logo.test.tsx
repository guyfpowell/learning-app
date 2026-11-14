import { render } from '@testing-library/react-native';
import { markCobaltOutlineSvg, markWhiteOutlineSvg } from '@/assets/logo';
import { Logo, markSvgs } from '../Logo';

describe('Logo variants (104)', () => {
  it('each variant is its own approved file, with no <text element', () => {
    expect(markSvgs).toEqual({ white: markWhiteOutlineSvg, cobalt: markCobaltOutlineSvg });
    for (const svg of Object.values(markSvgs)) expect(svg).not.toContain('<text');
  });

  it('renders every variant', () => {
    for (const variant of ['white', 'cobalt'] as const) {
      const { toJSON, unmount } = render(<Logo variant={variant} />);
      expect(toJSON()).not.toBeNull();
      unmount();
    }
  });
});
