import { PAYWALL_ROUTE } from '../subscriptions';
import { lessonRoute, trackRoute } from '../routes';

describe('route helpers (ADR-016)', () => {
  it('lessonRoute resolves to the root-stack lesson path', () => {
    expect(lessonRoute('lesson-1')).toBe('/lesson/lesson-1');
  });

  it('trackRoute resolves to the root-stack track path for either kind', () => {
    expect(trackRoute('track', 'skill-1')).toBe('/track/track/skill-1');
    expect(trackRoute('custom', 'plan-1')).toBe('/track/custom/plan-1');
  });

  it('PAYWALL_ROUTE is the root-stack paywall path', () => {
    expect(PAYWALL_ROUTE).toBe('/paywall');
  });
});
