import { mixHex } from '../mixHex';

describe('mixHex', () => {
  it('returns the first colour at 0 and the second at 1', () => {
    expect(mixHex('#102030', '#ffffff', 0)).toBe('#102030');
    expect(mixHex('#102030', '#ffffff', 1)).toBe('#ffffff');
  });

  it('mixes halfway', () => {
    expect(mixHex('#000000', '#fefefe', 0.5)).toBe('#7f7f7f');
  });
});
