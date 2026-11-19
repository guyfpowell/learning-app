import type { CustomPath, PathNextLesson, TrackPath, TrackPlan, UserTrackEnrollment } from '@learning/shared';
import { FIXTURE_TIMESTAMP as TIMESTAMP, lessonBase } from './lessons';

/** A complete next lesson for a path; `overrides` replace any field. */
export function makeNextLesson(overrides: Partial<PathNextLesson> = {}): PathNextLesson {
  return { ...lessonBase(), resumePhase: null, ...overrides };
}

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

/** A complete custom-path record as `POST /track-plans` returns it; `overrides` replace any field. */
export function makeTrackPlan(overrides: Partial<TrackPlan> = {}): TrackPlan {
  return {
    id: 'plan-1', name: 'My path', description: null, status: 'active',
    planJson: { topics: [] }, createdAt: TIMESTAMP, updatedAt: TIMESTAMP, ...overrides,
  };
}

/** A complete enrolment record as `POST /enrollments` returns it; `overrides` replace any field. */
export function makeEnrollment(overrides: Partial<UserTrackEnrollment> = {}): UserTrackEnrollment {
  return { id: 'enrol-1', userId: 'user-1', skillId: 'skill-1', enrolledAt: TIMESTAMP, completedAt: null, ...overrides };
}
