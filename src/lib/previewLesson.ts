import type { QueryClient } from '@tanstack/react-query';
import type { Lesson } from '@learning/shared';
import { lessonQueryKey } from '@/lib/queryKeys';

/** The id of the made-up completed lesson the dev preview opens on the real lesson screen. */
export const PREVIEW_LESSON_ID = 'preview-completed';

/** A made-up lesson the person has already completed: a summary, a takeaway, a body and three quiz questions. */
export function previewCompletedLesson(): Lesson {
  return {
    id: PREVIEW_LESSON_ID,
    skillPathId: 'preview-skill-path',
    lessonNumber: 3,
    title: 'Pricing a new product',
    summary: 'Price is a message about value. Start from what the customer gains, check what competitors charge, and test before you commit.',
    keyTakeaway: 'Price what the customer gains, not what the product costs you.',
    topicName: 'Pricing and packaging',
    lessonIndex: 3,
    totalLessons: 8,
    durationMinutes: 6,
    difficulty: 'intermediate',
    isTeaser: false,
    isSaved: false,
    rating: null,
    quizCompleted: true,
    lessonRetakeInProgress: false,
    nextLessonId: 'preview-next',
    skillPath: { level: 'intermediate', levelLabel: 'Intermediate' },
    content:
      'Most first prices are set by adding a margin to cost. It is easy to defend and usually wrong, because the customer never sees your costs. They see what the product does for them.\n\n' +
      'Start with the value. What does the customer save, earn or avoid? A tool that saves a team ten hours a week is worth far more than the hours it took to build.\n\n' +
      'Then look sideways. What do competitors and the customer\'s current workaround cost? That sets the range a buyer will compare you to.\n\n' +
      'Finally, test. Show two or three price points to real prospects and watch where they hesitate. A price you have never tested is a guess.',
    quizzes: [
      {
        id: 'preview-q1',
        lessonId: PREVIEW_LESSON_ID,
        type: 'multiple-choice',
        question: 'Which is the best starting point for a first price?',
        options: ['Your costs plus a margin', 'The value to the customer', 'The lowest competitor price', 'Whatever the founder prefers'],
        correctAnswer: 'The value to the customer',
        explanation: 'The customer never sees your costs. They weigh what the product does for them.',
      },
      {
        id: 'preview-q2',
        lessonId: PREVIEW_LESSON_ID,
        type: 'multiple-choice',
        question: 'What does looking at competitors tell you?',
        options: ['The exact price to charge', 'The range a buyer will compare you to', 'Nothing useful', 'That you should always undercut them'],
        correctAnswer: 'The range a buyer will compare you to',
        explanation: 'Competitors and workarounds frame the comparison; they do not set your price.',
      },
      {
        id: 'preview-q3',
        lessonId: PREVIEW_LESSON_ID,
        type: 'short-answer',
        question: 'Why test a price before committing to it?',
        options: [],
        correctAnswer: 'An untested price is a guess',
        explanation: 'Watching where real prospects hesitate shows where the price stops matching the value.',
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

/** The id of the made-up lesson that has not been started: its screen runs to "Test My Knowledge". */
export const PREVIEW_IN_PROGRESS_ID = 'preview-in-progress';

/** The same made-up lesson, not yet completed and with no key takeaway: the one case where the lesson screen's old "Test My Knowledge" button shows. */
export function previewInProgressLesson(): Lesson {
  const done = previewCompletedLesson();
  return {
    ...done,
    id: PREVIEW_IN_PROGRESS_ID,
    keyTakeaway: undefined,
    quizCompleted: false,
    nextLessonId: null,
    quizzes: done.quizzes.map(q => ({ ...q, lessonId: PREVIEW_IN_PROGRESS_ID })),
  };
}

/** Puts the made-up lesson in the cache, and keeps it fresh so the lesson screen never fetches it from the server. */
export function seedPreviewLesson(client: QueryClient): void {
  client.setQueryDefaults(lessonQueryKey(PREVIEW_LESSON_ID), { staleTime: Infinity });
  client.setQueryData(lessonQueryKey(PREVIEW_LESSON_ID), previewCompletedLesson());
  client.setQueryDefaults(lessonQueryKey(PREVIEW_IN_PROGRESS_ID), { staleTime: Infinity });
  client.setQueryData(lessonQueryKey(PREVIEW_IN_PROGRESS_ID), previewInProgressLesson());
}
