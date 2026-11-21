import { levelRowsOf, type LevelRow } from '@learning/shared';
import { colors } from '@/theme';
import { must } from '@/test-utils/must';
import { ALTITUDE_INK, BAND_LOOK, RAIL_X, bandKeyAtY, inkAt, topOf, whiteAt } from '../chartLayout';
import {
  axisNumberStyleOf,
  levelRowColoursOf,
  levelLookAt,
  levelStripStyleOf,
  levelTickStyleOf,
} from '../levelChartStyles';

// Level 10 (1,120m): levels 1 to 9 passed, 10 yours, 11 to 30 ahead.
const ROWS = levelRowsOf({ metres: 1_120, level: 10 });
const PAST_KARMAN_ROWS = levelRowsOf({ metres: 120_000, level: 30 });

type LevelOnly = Extract<LevelRow, { kind: 'level' }>;

function levelRow(level: number): LevelOnly {
  const row = ROWS.find((r): r is LevelOnly => r.kind === 'level' && r.level === level);
  return must(row, `level ${level}`);
}

describe('levelLookAt', () => {
  it('follows the band under the point, not the band a level starts in', () => {
    const nineteen = levelRow(19);
    const y = topOf(nineteen.position);
    expect(levelLookAt(y)).toBe(BAND_LOOK[bandKeyAtY(y)]);
    expect(levelLookAt(topOf(0.9))).toBe(BAND_LOOK.space);
    expect(levelLookAt(topOf(0.1))).toBe(BAND_LOOK['uk-hills']);
  });
});

describe('levelStripStyleOf', () => {
  it('spans the level from the rail to the right edge, between its two ticks', () => {
    const row = levelRow(6);
    const style = must(levelStripStyleOf(row), 'strip');
    expect(style).toMatchObject({ position: 'absolute', left: RAIL_X, right: 0, top: topOf(row.strip.to) });
    expect(style.height).toBeCloseTo(topOf(row.strip.from) - topOf(row.strip.to));
  });

  it('tints every even level over a light band in ink and over a dark band in white, and draws no odd level', () => {
    expect(levelStripStyleOf(levelRow(6))?.backgroundColor).toBe(inkAt(0.024));
    expect(levelStripStyleOf(levelRow(20))?.backgroundColor).toBe(whiteAt(0.035));
    expect(levelStripStyleOf(levelRow(7))).toBeNull();
    expect(levelStripStyleOf(levelRow(21))).toBeNull();
  });

  it('tints the learner\'s level gold, with a gold line along its top and its foot', () => {
    expect(levelStripStyleOf(levelRow(10))).toMatchObject({
      backgroundColor: 'rgba(242,181,47,0.2)',
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: 'rgba(201,138,12,0.5)',
    });
  });
});

describe('levelTickStyleOf', () => {
  it('is a 12 wide, 1.5 tall tick on the rail\'s left at the level\'s start, ink over light bands and white over dark ones', () => {
    const light = levelRow(6);
    expect(levelTickStyleOf(light)).toEqual({
      position: 'absolute', left: RAIL_X - 6, width: 12, height: 1.5, top: topOf(light.strip.from) - 0.75, backgroundColor: inkAt(0.28),
    });
    expect(levelTickStyleOf(levelRow(20)).backgroundColor).toBe(whiteAt(0.45));
  });
});

describe('levelRowColoursOf', () => {
  it('is ink for a passed level and muted for one ahead, with the detail muted either way', () => {
    const light = BAND_LOOK['uk-hills'];
    expect(levelRowColoursOf('passed', light)).toEqual({ name: colors.textStrong, detail: colors.textMuted });
    expect(levelRowColoursOf('ahead', light)).toEqual({ name: colors.textMuted, detail: colors.textMuted });
  });

  it('is white-toned on a dark band', () => {
    const dark = BAND_LOOK.sky;
    expect(levelRowColoursOf('ahead', dark)).toEqual({ name: whiteAt(0.66), detail: whiteAt(0.66) });
    expect(levelRowColoursOf('passed', dark).name).toBe(colors.white);
  });
});

describe('axisNumberStyleOf', () => {
  it('right-aligns a passed number in ink and an ahead one muted, 13pt black', () => {
    const light = BAND_LOOK['uk-hills'];
    const passed = axisNumberStyleOf('passed', light);
    expect(passed.text).toMatchObject({ fontSize: 13, color: colors.textStrong, textAlign: 'right', width: 42 });
    expect(passed.box).toBeNull();
    expect(axisNumberStyleOf('ahead', light).text.color).toBe(colors.textMuted);
    expect(axisNumberStyleOf('ahead', BAND_LOOK.sky).text.color).toBe(whiteAt(0.66));
  });

  it('draws the learner\'s number in a gold pill', () => {
    const current = axisNumberStyleOf('current', BAND_LOOK['uk-hills']);
    expect(current.box).toMatchObject({ height: 22, minWidth: 28, borderRadius: 11, backgroundColor: colors.altitude });
    expect(current.text.color).toBe(ALTITUDE_INK);
  });
});

describe('the Level view\'s leader colour', () => {
  it('is ink at .18 over a light band and white at .3 over a dark one', () => {
    expect(BAND_LOOK['uk-hills'].levelLeader).toBe(inkAt(0.18));
    expect(BAND_LOOK.space.levelLeader).toBe(whiteAt(0.3));
  });
});
