import type { Lesson } from '@learning/shared';

export const FIXTURE_TIMESTAMP = '2026-01-01T00:00:00Z';

/** The fields every lesson shape carries (a full `Lesson`, a path's `nextLesson`). */
export function lessonBase(): Omit<Lesson, 'quizzes'> {
  return {
    id:              'lesson-1',
    skillPathId:     'sp-1',
    lessonNumber:    1,
    title:           'Introduction to Product Management',
    content:         'Lesson content.',
    durationMinutes: 3,
    difficulty:      'beginner',
    isTeaser:        false,
    createdAt:       FIXTURE_TIMESTAMP,
    updatedAt:       FIXTURE_TIMESTAMP,
  };
}

/** A complete lesson with no quiz; `overrides` replace any field. */
export function makeLesson(overrides: Partial<Lesson> = {}): Lesson {
  return { ...lessonBase(), quizzes: [], ...overrides };
}
