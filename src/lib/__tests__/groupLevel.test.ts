import { levelOfGroup } from '../groupLevel';

describe('levelOfGroup', () => {
  it.each(['beginner', 'intermediate', 'advanced', 'expert'] as const)('a curated group keyed %s keeps its level', (level) => {
    expect(levelOfGroup(level)).toBe(level);
  });

  it('a custom path\'s reason sentence takes cobalt, the intermediate colour', () => {
    expect(levelOfGroup('Because you asked about pricing')).toBe('intermediate');
  });
});
