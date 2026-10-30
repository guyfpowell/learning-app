import { TAB_BAR_CLEARANCE, TAB_BAR_HEIGHT, TAB_SCREEN_EDGES } from '../safeArea';

describe('TAB_SCREEN_EDGES (090)', () => {
  it('leaves the top and bottom insets to the tab layout, so no blank band sits above the tab bar', () => {
    expect([...TAB_SCREEN_EDGES]).toEqual(['left', 'right']);
  });
});

describe('TAB_BAR_CLEARANCE (096)', () => {
  it('is more than the bar and its lift above the bottom edge, so the last item scrolls clear of it', () => {
    expect(TAB_BAR_CLEARANCE).toBeGreaterThan(TAB_BAR_HEIGHT + 30);
  });
});
