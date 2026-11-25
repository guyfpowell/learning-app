import { markCobaltOutlineSvg } from '@/assets/logo';
import { MARK_CHEVRONS, MARK_CHEVRON_STROKE, MARK_COLOUR, MARK_SQUARE, MARK_SQUARE_LENGTH, MARK_SQUARE_PATH, MARK_VIEW_BOX } from '@/assets/splashMark';
import { chevronBandOf, SPLASH_MS } from '../splashSteps';

describe('splash mark', () => {
  it('has exactly the approved file\'s square', () => {
    const { x, y, width, height, rx, strokeWidth } = MARK_SQUARE;
    expect(markCobaltOutlineSvg).toContain(`<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}" fill="none" stroke="${MARK_COLOUR}" stroke-width="${strokeWidth}">`);
    expect(markCobaltOutlineSvg).toContain(`viewBox="0 0 ${MARK_VIEW_BOX} ${MARK_VIEW_BOX}"`);
  });

  it('has exactly the approved file\'s two chevrons', () => {
    for (const points of Object.values(MARK_CHEVRONS)) {
      expect(markCobaltOutlineSvg).toContain(`<polyline points="${points}" fill="none" stroke="${MARK_COLOUR}" stroke-width="${MARK_CHEVRON_STROKE}"`);
    }
  });

  it('draws the loading line from the top\'s middle, and knows its length', () => {
    expect(MARK_SQUARE_PATH.startsWith(`M${MARK_VIEW_BOX / 2} ${MARK_SQUARE.y} H`)).toBe(true);
    const straight = 4 * (MARK_SQUARE.width - 2 * MARK_SQUARE.rx);
    expect(MARK_SQUARE_LENGTH).toBeCloseTo(straight + 2 * Math.PI * MARK_SQUARE.rx);
  });

  it('measures the chevrons\' band inside the mark', () => {
    const band = chevronBandOf(MARK_VIEW_BOX);
    expect(band).toEqual({ top: 73 - MARK_CHEVRON_STROKE / 2, height: 127 - 73 + MARK_CHEVRON_STROKE });
  });

  it('fills the chevrons before the splash starts to fade', () => {
    expect(SPLASH_MS.fillDone).toBeLessThan(SPLASH_MS.hold);
  });
});
