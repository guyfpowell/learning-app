import { hasMedalArt, medalArtOf, type AchievementDefinition } from '@learning/shared';
import { medal } from '@/theme';

/** The medal's colour: the art's jewel, or cobalt for a reward with no medal art. */
export function medalJewelOf(definition: Pick<AchievementDefinition, 'key' | 'kind'>): string {
  const art = hasMedalArt(definition) ? medalArtOf(definition.key) : null;
  return art?.jewel ?? medal.cobalt;
}
