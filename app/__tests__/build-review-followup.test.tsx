/**
 * 068 Chunk 7d — the "change anything" box ships hidden, on mobile too.
 *
 * Kept in step with the web test of the same purpose. The flag is a build-time
 * constant, so this asserts the shipped value directly: if someone flips it to
 * try it out, this fails and says the box is now visible to every user.
 */
import { PLAN_FOLLOW_UP_ENABLED } from '@learning/shared';

it('ships with the follow-up flag off', () => {
  expect(PLAN_FOLLOW_UP_ENABLED).toBe(false);
});
