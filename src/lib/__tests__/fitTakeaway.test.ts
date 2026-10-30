import {
  nextTakeawayFit,
  TAKEAWAY_DEFAULT_SIZE,
  TAKEAWAY_LAST_LINE_FILL,
  TAKEAWAY_MAX_SIZE,
  TAKEAWAY_MIN_SIZE,
  TAKEAWAY_RANGE,
  TAKEAWAY_STEP,
} from '../fitTakeaway';

const WIDTH = 300;
const MAX_HEIGHT = 400;
const line = (width: number, height = 40) => ({ width, height });

describe('nextTakeawayFit (096)', () => {
  it('the default range is the takeaway\'s', () => {
    expect(TAKEAWAY_RANGE).toEqual({ min: TAKEAWAY_MIN_SIZE, max: TAKEAWAY_MAX_SIZE });
  });

  it('steps down and stops within a range given by the caller', () => {
    const range = { min: 20, max: 26 };
    const short = [line(WIDTH), line(WIDTH * 0.3)];
    expect(nextTakeawayFit(short, 26, WIDTH, MAX_HEIGHT, undefined, range)).toMatchObject({ size: 25.5, settled: false });
    // Stepping below the range's minimum settles on the fullest size seen.
    expect(nextTakeawayFit(short, 20, WIDTH, MAX_HEIGHT, { size: 24, fill: 0.8 }, range)).toMatchObject({ size: 24, settled: true });
    // The takeaway's 18pt is below this range, so it is not tried.
    expect(nextTakeawayFit(short, 20, WIDTH, MAX_HEIGHT, undefined, range).size).toBe(20);
  });

  it('the range is a little above the default and a bit below it', () => {
    expect(TAKEAWAY_MAX_SIZE).toBeGreaterThan(TAKEAWAY_DEFAULT_SIZE);
    expect(TAKEAWAY_MIN_SIZE).toBeLessThan(TAKEAWAY_DEFAULT_SIZE);
  });

  it('accepts a size whose last line is nearly full and fits the height', () => {
    const lines = [line(WIDTH), line(WIDTH), line(WIDTH * TAKEAWAY_LAST_LINE_FILL)];
    expect(nextTakeawayFit(lines, TAKEAWAY_MAX_SIZE, WIDTH, MAX_HEIGHT)).toEqual({ size: TAKEAWAY_MAX_SIZE, settled: true });
  });

  it('tries a half point smaller when the last line is short', () => {
    const lines = [line(WIDTH), line(WIDTH * 0.3)];
    expect(nextTakeawayFit(lines, 23, WIDTH, MAX_HEIGHT)).toMatchObject({ size: 23 - TAKEAWAY_STEP, settled: false });
  });

  it('tries a half point smaller when the text is taller than the budget, even with a full last line', () => {
    const lines = Array.from({ length: 11 }, () => line(WIDTH));
    expect(nextTakeawayFit(lines, 23, WIDTH, MAX_HEIGHT)).toMatchObject({ size: 23 - TAKEAWAY_STEP, settled: false });
  });

  it('settles on the size with the fullest last line when none reaches the target', () => {
    const lines = [line(WIDTH), line(WIDTH * 0.1)];
    const best = { size: 20, fill: 0.8 };
    expect(nextTakeawayFit(lines, TAKEAWAY_MIN_SIZE, WIDTH, MAX_HEIGHT, best)).toMatchObject({ size: 20, settled: true });
  });

  it('remembers the fullest last line as it steps down', () => {
    const first = nextTakeawayFit([line(WIDTH), line(WIDTH * 0.5)], 23, WIDTH, MAX_HEIGHT);
    expect(first).toMatchObject({ size: 23 - TAKEAWAY_STEP, settled: false, best: { size: 23, fill: 0.5 } });
    const second = nextTakeawayFit([line(WIDTH), line(WIDTH * 0.2)], first.size, WIDTH, MAX_HEIGHT, first.best);
    expect(second.best).toEqual({ size: 23, fill: 0.5 });
    const third = nextTakeawayFit([line(WIDTH), line(WIDTH * 0.8)], second.size, WIDTH, MAX_HEIGHT, second.best);
    expect(third.best).toEqual({ size: second.size, fill: 0.8 });
  });

  it('ignores a size taller than the height budget when choosing the best', () => {
    const tall = Array.from({ length: 11 }, () => line(WIDTH * 0.9));
    expect(nextTakeawayFit(tall, 23, WIDTH, MAX_HEIGHT).best).toBeUndefined();
  });

  it('settles on the default size when no size fitted the height budget', () => {
    const tall = Array.from({ length: 11 }, () => line(WIDTH * 0.5));
    expect(nextTakeawayFit(tall, TAKEAWAY_MIN_SIZE, WIDTH, MAX_HEIGHT)).toMatchObject({ size: TAKEAWAY_DEFAULT_SIZE, settled: true });
  });

  it('a tie in fill goes to the size nearer the default', () => {
    const lines = [line(WIDTH), line(WIDTH * 0.5)];
    const far = nextTakeawayFit(lines, TAKEAWAY_MAX_SIZE, WIDTH, MAX_HEIGHT);
    const near = nextTakeawayFit(lines, TAKEAWAY_DEFAULT_SIZE, WIDTH, MAX_HEIGHT, far.best);
    expect(near.best?.size).toBe(TAKEAWAY_DEFAULT_SIZE);
  });

  it('accepts the smallest size if its last line fills', () => {
    const lines = [line(WIDTH), line(WIDTH)];
    expect(nextTakeawayFit(lines, TAKEAWAY_MIN_SIZE, WIDTH, MAX_HEIGHT)).toEqual({ size: TAKEAWAY_MIN_SIZE, settled: true });
  });

  it('settles on the default size when there is nothing to measure', () => {
    expect(nextTakeawayFit([], 23, WIDTH, MAX_HEIGHT)).toEqual({ size: TAKEAWAY_DEFAULT_SIZE, settled: true });
    expect(nextTakeawayFit([line(10)], 23, 0, MAX_HEIGHT)).toEqual({ size: TAKEAWAY_DEFAULT_SIZE, settled: true });
  });
});
