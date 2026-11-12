import type { Skill } from '@learning/shared';

/** How many tracks the new-user Home suggests. */
export const SUGGESTED_TRACKS = 3;

/**
 * The tracks a brand-new person is shown to start from: an AI track first when there is one (the
 * market wedge), then the others in the catalogue's own order.
 */
export function suggestedTracks(skills: Skill[] | undefined): Skill[] {
  if (!skills?.length) return [];
  const ordered = [...skills].sort((a, b) => a.order - b.order);
  const ai = ordered.find(s => /\bAI\b/i.test(s.name));
  const rest = ordered.filter(s => s !== ai);
  return (ai ? [ai, ...rest] : rest).slice(0, SUGGESTED_TRACKS);
}
