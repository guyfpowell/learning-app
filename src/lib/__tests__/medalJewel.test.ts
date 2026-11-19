import { ACHIEVEMENTS_BY_KEY, medalArtOf } from '@learning/shared';
import { medalJewelOf } from '@/lib/medalJewel';
import { medal } from '@/theme';
import { must } from '@/test-utils/must';

describe('medalJewelOf', () => {
  it('is the art\'s jewel colour, and cobalt for a step', () => {
    expect(medalJewelOf(ACHIEVEMENTS_BY_KEY['clean-sheet'])).toBe(must(medalArtOf('clean-sheet'), 'clean-sheet').jewel);
    expect(medalJewelOf(ACHIEVEMENTS_BY_KEY['signed-on'])).toBe(medal.cobalt);
  });
});
