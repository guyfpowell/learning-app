import type { CustomPath, TrackPath } from '@learning/shared';

const TIMESTAMP = '2026-01-01T00:00:00Z';

/** A complete curated-track path; `overrides` replace any field. */
export function makeTrackPath(overrides: Partial<TrackPath> = {}): TrackPath {
  return {
    kind:             'track',
    id:               'skill-1',
    name:             'Product Strategy',
    description:      null,
    nextLesson:       null,
    totalLessons:     10,
    completedLessons: 3,
    percentComplete:  30,
    isActive:         false,
    canSkipTopic:     false,
    canSkipLevel:     false,
    canSkipLesson:    false,
    averageScore:     null,
    capstoneScore:    null,
    levels:           [],
    topicEnd:         null,
    skill: {
      id:          'skill-1',
      trackId:     1,
      name:        'Product Strategy',
      description: 'Learn product strategy',
      headline:    'Learn product strategy',
      detail:      null,
      category:    'product-management',
      order:       1,
      createdAt:   TIMESTAMP,
      updatedAt:   TIMESTAMP,
    },
    enrolledAt:  TIMESTAMP,
    completedAt: null,
    ...overrides,
  };
}

/** A complete custom (Albert-built) path; `overrides` replace any field. */
export function makeCustomPath(overrides: Partial<CustomPath> = {}): CustomPath {
  return {
    kind:             'custom',
    id:               'plan-1',
    name:             'My Path',
    description:      null,
    nextLesson:       null,
    totalLessons:     10,
    completedLessons: 3,
    percentComplete:  30,
    isActive:         false,
    canSkipTopic:     false,
    canSkipLevel:     false,
    canSkipLesson:    false,
    averageScore:     null,
    capstoneScore:    null,
    levels:           [],
    topicEnd:         null,
    unresolvedTopics: 0,
    hasProposal:      false,
    revisit:          null,
    isFinished:       false,
    ...overrides,
  };
}
