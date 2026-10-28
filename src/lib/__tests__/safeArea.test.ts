import { TAB_SCREEN_EDGES } from '../safeArea';

describe('TAB_SCREEN_EDGES (090)', () => {
  it('leaves the top and bottom insets to the tab layout, so no blank band sits above the tab bar', () => {
    expect([...TAB_SCREEN_EDGES]).toEqual(['left', 'right']);
  });
});
