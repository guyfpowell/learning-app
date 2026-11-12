import type { UserPath } from '@learning/shared';
import { hasAlbertSuggestion } from '../albertSuggestion';

const path = (over: Record<string, unknown>): UserPath => ({ id: 'p', ...over } as UserPath);

describe('hasAlbertSuggestion', () => {
  it('is false before the paths have loaded and with no paths', () => {
    expect(hasAlbertSuggestion(undefined)).toBe(false);
    expect(hasAlbertSuggestion([])).toBe(false);
  });

  it('is true when a custom path has a suggestion waiting', () => {
    expect(hasAlbertSuggestion([path({ kind: 'custom', hasProposal: false }), path({ kind: 'custom', hasProposal: true })])).toBe(true);
  });

  it('is false when no custom path has one', () => {
    expect(hasAlbertSuggestion([path({ kind: 'custom', hasProposal: false }), path({ kind: 'track' })])).toBe(false);
  });
});
