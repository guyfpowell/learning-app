import type { SessionUser } from '@learning/shared';

/** A complete signed-in free user with nothing spent; `overrides` replace any field. */
export function makeSessionUser(overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    id:              'user-1',
    email:           'learner@example.com',
    name:            'Learner',
    role:            'user',
    emailVerified:   true,
    profile:         null,
    isPremium:       false,
    albertAllowance: { used: 0, total: 1 },
    freshPathTrial:  { capstones: 0, total: 2 },
    ...overrides,
  };
}
