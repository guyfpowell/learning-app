import { DEFAULT_NEW_USER_HOME, nextNewUserHome, useNewUserHomeStore } from '../newUserHome.store';

describe('new-user Home store', () => {
  beforeEach(() => useNewUserHomeStore.setState({ variant: DEFAULT_NEW_USER_HOME }));

  it('shows the climb (1c) until told otherwise', () => {
    expect(useNewUserHomeStore.getState().variant).toBe('1c');
  });

  it('cycles 1a, 1b, 1c and round again', () => {
    expect(nextNewUserHome('1a')).toBe('1b');
    expect(nextNewUserHome('1b')).toBe('1c');
    expect(nextNewUserHome('1c')).toBe('1a');
  });

  it('sets the variant', () => {
    useNewUserHomeStore.getState().setVariant('1c');
    expect(useNewUserHomeStore.getState().variant).toBe('1c');
  });
});
