import { trailFrame } from '../SubLevel';

describe('trailFrame', () => {
  it('draws past the 100 by 32 box on every side, so the halo and dots are not clipped', () => {
    const { minX, minY, drawWidth, drawHeight } = trailFrame(72);
    // The first stop's halo reaches x = 6 - 11 and y = 26 + 11; the last stop's reaches x = 94 + 11 and y = 5 - 11.
    expect(minX).toBeLessThanOrEqual(-5);
    expect(minY).toBeLessThanOrEqual(-6);
    expect(minX + drawWidth).toBeGreaterThanOrEqual(105);
    expect(minY + drawHeight).toBeGreaterThanOrEqual(37);
  });

  it('keeps the layout size by pulling the padding back with a negative margin', () => {
    const { margin, scaledWidth, scaledHeight } = trailFrame(72);
    expect(scaledWidth + margin * 2).toBeCloseTo(72);
    expect(scaledHeight + margin * 2).toBeCloseTo(72 * 0.32);
  });
});
