import { isSkillLevel, type SkillLevel } from '@learning/shared';

/**
 * The level a group draws in: a curated track's group key is its level, so it takes that level's
 * colour; a custom path's group is a reason sentence, so it takes cobalt.
 */
export function levelOfGroup(key: string): SkillLevel {
  return isSkillLevel(key) ? key : 'intermediate';
}
