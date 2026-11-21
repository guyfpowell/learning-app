import { useAppUpdateStore } from '../appUpdate.store';

describe('app update store', () => {
  beforeEach(() => useAppUpdateStore.setState({ required: false }));

  it('starts with no update required', () => {
    expect(useAppUpdateStore.getState().required).toBe(false);
  });

  it('require() turns the update screen on', () => {
    useAppUpdateStore.getState().require();
    expect(useAppUpdateStore.getState().required).toBe(true);
  });
});
