import { HEIGHT_BANDS } from '@learning/shared';
import {
  BAND_HEIGHT,
  CANVAS_HEIGHT,
  CHART_HEIGHT,
  CHART_TOP,
  SEA_LEVEL_STRIP_HEIGHT,
  SEA_LEVEL_Y,
  bandKeyAtY,
  canvasYOf,
  openingOffsetOf,
  topOf,
} from '../chartLayout';

const VIEWPORT = 800;

describe('the canvas', () => {
  it('is the chart with space above it and the sea level strip below it', () => {
    expect(SEA_LEVEL_Y).toBe(CHART_TOP + CHART_HEIGHT);
    expect(CANVAS_HEIGHT).toBe(SEA_LEVEL_Y + SEA_LEVEL_STRIP_HEIGHT);
  });

  it('is divided into four equal bands', () => {
    expect(BAND_HEIGHT * HEIGHT_BANDS.length).toBe(CHART_HEIGHT);
  });
});

describe('topOf', () => {
  it('puts sea level at the foot of the chart and the top of space at the chart top', () => {
    expect(topOf(0)).toBe(SEA_LEVEL_Y);
    expect(topOf(1)).toBe(CHART_TOP);
  });
});

describe('canvasYOf', () => {
  it('moves an offset from the top of the chart down by the space above it', () => {
    expect(canvasYOf(0)).toBe(CHART_TOP);
    expect(canvasYOf(CHART_HEIGHT)).toBe(SEA_LEVEL_Y);
  });
});

describe('bandKeyAtY', () => {
  const topDown = [...HEIGHT_BANDS].reverse();

  it('names the band whose stretch of the canvas holds y', () => {
    topDown.forEach((band, i) => {
      expect(bandKeyAtY(CHART_TOP + i * BAND_HEIGHT + BAND_HEIGHT / 2)).toBe(band.key);
    });
  });

  it('reads the space above the chart as space and the sea level strip as the lowest band', () => {
    expect(bandKeyAtY(0)).toBe(topDown[0].key);
    expect(bandKeyAtY(CANVAS_HEIGHT)).toBe(topDown[topDown.length - 1].key);
  });
});

describe('openingOffsetOf', () => {
  it('centres the learner in the viewport', () => {
    expect(openingOffsetOf(0.5, VIEWPORT)).toBe(topOf(0.5) - VIEWPORT / 2);
  });

  it('stops at the top of the canvas for a learner at the top', () => {
    expect(openingOffsetOf(1, VIEWPORT)).toBe(0);
  });

  it('stops at the bottom of the canvas for a learner at sea level', () => {
    expect(openingOffsetOf(0, VIEWPORT)).toBe(CANVAS_HEIGHT - VIEWPORT);
  });
});
