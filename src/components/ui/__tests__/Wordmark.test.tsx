import { wordmarkWhiteSvg } from '@/assets/logo';
import { wordmarkSize } from '../Wordmark';

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
