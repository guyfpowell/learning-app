import { HEIGHT_BANDS, levelTicks, type LevelTick } from '@learning/shared';
import { colors } from '@/theme';
import { BAND_HEIGHT, BAND_LOOK, CANVAS_HEIGHT, CHART_TOP, LEADER_END_X, RAIL_X, SEA_LEVEL_Y, topOf } from '../chartLayout';
import {
  SLOT_HEIGHT,
  bandBoundaryStyleOf,
  bandNameSlotOf,
  bandNameStyleOf,
  dotStyleOf,
  headerLookOf,
  leaderBoxOf,
  railStylesOf,
  rowColoursOf,
  slotTopOf,
  tickStyleOf,
} from '../chartStyles';

const TOP_DOWN = [...HEIGHT_BANDS].reverse();
const LIGHT = BAND_LOOK[TOP_DOWN[3].key];
const DARK = BAND_LOOK[TOP_DOWN[0].key];

function tick(level: number): LevelTick {
  const found = levelTicks().find((t) => t.level === level);
  if (found === undefined) throw new Error(`no tick for level ${level}`);
  return found;
}

describe('slotTopOf', () => {
  it('centres a slot on y', () => {
    expect(slotTopOf(1_000) + SLOT_HEIGHT / 2).toBe(1_000);
  });
});

describe('the band names', () => {
  it('are centred on their band at the right edge, turned 90 degrees', () => {
    TOP_DOWN.forEach((_, i) => {
      const slot = bandNameSlotOf(i);
      expect((slot.top as number) + (slot.height as number) / 2).toBe(CHART_TOP + i * BAND_HEIGHT + BAND_HEIGHT / 2);
      expect(slot.transform).toEqual([{ rotate: '90deg' }]);
    });
  });

  it('are 10.5 extra bold at 0.14em, ink 0.4 on a light band and white 0.5 on a dark one', () => {
    const light = bandNameStyleOf(LIGHT);
    expect(light).toMatchObject({ fontSize: 10.5, letterSpacing: 10.5 * 0.14, color: 'rgba(18,21,34,0.4)' });
    expect(bandNameStyleOf(DARK).color).toBe('rgba(255,255,255,0.5)');
  });

  it('have a 1pt line on each boundary, from the rail to the right edge, coloured by the band above', () => {
    [0, 1, 2].forEach((i) => {
      const line = bandBoundaryStyleOf(i);
      expect(line).toMatchObject({ top: CHART_TOP + (i + 1) * BAND_HEIGHT, left: RAIL_X, right: 0, height: 1 });
      expect(line.backgroundColor).toBe(BAND_LOOK[TOP_DOWN[i].key].boundary);
    });
    expect(bandBoundaryStyleOf(1).backgroundColor).toBe('rgba(255,255,255,0.14)');
    expect(bandBoundaryStyleOf(2).backgroundColor).toBe('rgba(18,21,34,0.08)');
  });
});

describe('the rail', () => {
  const rail = railStylesOf(2_000);

  it('runs 3 wide from 40 above the chart to sea level, white 0.18', () => {
    expect(rail.base).toMatchObject({ width: 3, top: CHART_TOP - 40, backgroundColor: 'rgba(255,255,255,0.18)' });
    expect((rail.base.top as number) + (rail.base.height as number)).toBe(SEA_LEVEL_Y);
  });

  it('is ink 0.1 over the two light bands only', () => {
    expect(rail.lightBands).toMatchObject({ top: CHART_TOP + 2 * BAND_HEIGHT, height: 2 * BAND_HEIGHT, backgroundColor: 'rgba(18,21,34,0.1)' });
  });

  it('has a 4 wide gold rail from the learner down to sea level and a 16 gold dot at the learner', () => {
    expect(rail.gold).toMatchObject({ width: 4, top: 2_000, height: SEA_LEVEL_Y - 2_000, backgroundColor: colors.altitude });
    expect(rail.dot).toMatchObject({ width: 16, height: 16, top: 2_000 - 8, backgroundColor: colors.altitude });
    expect(rail.dot.boxShadow).toEqual([{ offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 4, color: 'rgba(242,181,47,0.3)' }]);
  });
});

describe('the ticks', () => {
  it('are short on the rail\'s left, with every fifth longer and labelled to its left', () => {
    const short = tickStyleOf(tick(4));
    const long = tickStyleOf(tick(5));
    expect(short.label).toBeNull();
    expect(long.label).not.toBeNull();
    expect(short.line.width).toBeLessThan(long.line.width as number);
    expect((long.line.left as number) + (long.line.width as number)).toBe(RAIL_X);
    expect(long.label).toMatchObject({ textAlign: 'right', fontSize: 11 });
  });

  it('sit at the level\'s height', () => {
    const t = tick(5);
    expect(tickStyleOf(t).line.top).toBe(topOf(t.position));
  });

  it('are ink on a light band and white on a dark one', () => {
    expect(tickStyleOf(tick(5)).line.backgroundColor).toBe('rgba(18,21,34,0.55)');
    expect(tickStyleOf(tick(5)).label?.color).toBe('rgba(18,21,34,0.62)');
    expect(tickStyleOf(tick(4)).line.backgroundColor).toBe('rgba(18,21,34,0.28)');
    expect(tickStyleOf(tick(30)).line.backgroundColor).toBe('rgba(255,255,255,0.55)');
    expect(tickStyleOf(tick(30)).label?.color).toBe('rgba(255,255,255,0.62)');
    expect(tickStyleOf(tick(29)).line.backgroundColor).toBe('rgba(255,255,255,0.28)');
  });
});

describe('a leader line', () => {
  it('runs from the rail at the true height to the row\'s shown centre', () => {
    const box = leaderBoxOf(1_000, 940);
    expect(box.left + box.x1).toBe(RAIL_X);
    expect(box.left + box.x2).toBe(LEADER_END_X);
    expect(box.top + box.y1).toBe(1_000);
    expect(box.top + box.y2).toBe(940);
  });

  it('is level when the row was not moved', () => {
    const box = leaderBoxOf(1_000, 1_000);
    expect(box.y1).toBe(box.y2);
  });
});

describe('a rail dot', () => {
  it('is gold when passed and grey or blue-grey otherwise', () => {
    expect(dotStyleOf(500, 'passed', LIGHT).backgroundColor).toBe(colors.altitude);
    expect(dotStyleOf(500, 'passed', DARK).backgroundColor).toBe(colors.altitude);
    expect(dotStyleOf(500, 'locked', LIGHT).backgroundColor).toBe('#C9C2B4');
    expect(dotStyleOf(500, 'next', DARK).backgroundColor).toBe('#7884B8');
  });

  it('is centred on the rail at the true height', () => {
    const dot = dotStyleOf(500, 'locked', LIGHT);
    expect((dot.left as number) + (dot.width as number) / 2).toBeCloseTo(RAIL_X);
    expect((dot.top as number) + (dot.height as number) / 2).toBeCloseTo(500);
  });
});

describe('a row\'s colours', () => {
  it('are ink and muted when passed on a light band, white and white 0.66 on a dark one', () => {
    expect(rowColoursOf('passed', LIGHT)).toEqual({ name: colors.textStrong, detail: colors.textMuted });
    expect(rowColoursOf('passed', DARK)).toEqual({ name: '#FFFFFF', detail: 'rgba(255,255,255,0.66)' });
  });

  it('are muted for name and detail when locked', () => {
    expect(rowColoursOf('locked', LIGHT)).toEqual({ name: colors.textMuted, detail: colors.textMuted });
    expect(rowColoursOf('locked', DARK)).toEqual({ name: 'rgba(255,255,255,0.66)', detail: 'rgba(255,255,255,0.66)' });
  });
});

describe('the header', () => {
  it('is paper at 0.97 with ink over a light band', () => {
    const look = headerLookOf(CHART_TOP + 2 * BAND_HEIGHT + 10);
    expect(look).toEqual({ onDark: false, fade: 'rgba(243,241,236,0.97)', fadeClear: 'rgba(243,241,236,0)', ink: colors.textStrong });
  });

  it('is navy at 0.95 with white over a dark band', () => {
    const look = headerLookOf(CHART_TOP + 10);
    expect(look).toEqual({ onDark: true, fade: 'rgba(5,8,28,0.95)', fadeClear: 'rgba(5,8,28,0)', ink: '#FFFFFF' });
  });

  it('follows the band under it as the chart scrolls', () => {
    expect(headerLookOf(0).onDark).toBe(true);
    expect(headerLookOf(CANVAS_HEIGHT).onDark).toBe(false);
  });
});
