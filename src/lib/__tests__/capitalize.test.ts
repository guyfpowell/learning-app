import { capitalize } from '../capitalize';

describe('capitalize', () => {
  it('upper-cases the first letter and leaves the rest alone', () => {
    expect(capitalize('understand what AI tools')).toBe('Understand what AI tools');
  });

  it('returns an empty string unchanged', () => {
    expect(capitalize('')).toBe('');
  });
});
