import { medalKeyOf } from '@/lib/medalKey';
import medals from '@/components/ui/medals.json';
import { ACHIEVEMENTS } from '@learning/shared';

describe('medalKeyOf', () => {
  it('turns a kebab-case key into camelCase', () => {
    expect(medalKeyOf('clean-sheet')).toBe('cleanSheet');
    expect(medalKeyOf('above-the-clouds')).toBe('aboveTheClouds');
    expect(medalKeyOf('summit')).toBe('summit');
  });

  it('gives every achievement a medal', () => {
    const artwork = medals.flatMap(category => category.items.map(item => item.key));
    ACHIEVEMENTS.forEach(a => expect(artwork).toContain(medalKeyOf(a.key)));
  });
});
