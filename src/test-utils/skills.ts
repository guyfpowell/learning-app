import { SKILL_CATEGORIES, type Skill } from '@learning/shared';
import { FIXTURE_TIMESTAMP } from './lessons';

/** A complete track (`Skill`) placed at `order`, headline from its name; `overrides` replace any field. */
export function makeSkill(id: string, name: string, order: number, overrides: Partial<Skill> = {}): Skill {
  return {
    id,
    trackId: order,
    name,
    description: `${name} description`,
    headline: `${name} headline`,
    detail: null,
    category: SKILL_CATEGORIES[0],
    order,
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    ...overrides,
  };
}
