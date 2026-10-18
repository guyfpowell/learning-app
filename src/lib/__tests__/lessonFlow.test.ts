import type { Lesson } from '@learning/shared';
import { isRetakeInProgress } from '../lessonFlow';

const lesson = (over: Partial<Lesson>) =>
  ({ quizCompleted: true, resolvedQuizIds: ['a', 'b'], quizzes: [{ id: 'a' }, { id: 'b' }], ...over }) as Lesson;

describe('isRetakeInProgress', () => {
  it('is false for a lesson that is not completed', () => {
    expect(isRetakeInProgress(lesson({ quizCompleted: false, resolvedQuizIds: [] }), true)).toBe(false);
  });
  it('is false for a finished pass (every question resolved)', () => {
    expect(isRetakeInProgress(lesson({}), true)).toBe(false);
  });
  it('is true when the current pass is partly answered', () => {
    expect(isRetakeInProgress(lesson({ resolvedQuizIds: ['a'] }), false)).toBe(true);
  });
  it('is true when a retake was just started with no answers yet', () => {
    expect(isRetakeInProgress(lesson({ resolvedQuizIds: [] }), true)).toBe(true);
  });
  it('is false with no answers and no retake started this visit', () => {
    expect(isRetakeInProgress(lesson({ resolvedQuizIds: [] }), false)).toBe(false);
  });
});
