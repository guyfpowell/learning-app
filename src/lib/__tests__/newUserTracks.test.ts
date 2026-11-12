import type { Skill } from '@learning/shared';
import { suggestedTracks } from '../newUserTracks';

const skill = (name: string, order: number) => ({ id: name, name, order }) as Skill;

describe('suggestedTracks', () => {
  it('is empty before the catalogue has loaded', () => {
    expect(suggestedTracks(undefined)).toEqual([]);
    expect(suggestedTracks([])).toEqual([]);
  });

  it('leads with an AI track, then the rest in the catalogue\'s order, three in all', () => {
    const skills = [skill('Product Strategy', 1), skill('User Research', 2), skill('Product Metrics', 3), skill('AI Fundamentals', 4)];
    expect(suggestedTracks(skills).map(s => s.name)).toEqual(['AI Fundamentals', 'Product Strategy', 'User Research']);
  });

  it('is the first three in order when no track is about AI', () => {
    const skills = [skill('C', 3), skill('A', 1), skill('B', 2), skill('D', 4)];
    expect(suggestedTracks(skills).map(s => s.name)).toEqual(['A', 'B', 'C']);
  });
});
