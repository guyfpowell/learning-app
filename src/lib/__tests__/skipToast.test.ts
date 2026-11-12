import type { UserPath } from '@learning/shared';
import { skippedMessage } from '../skipToast';

const path = (lessonIndex?: number) => ({ nextLesson: lessonIndex === undefined ? null : { lessonIndex } } as UserPath);

describe('skippedMessage', () => {
  it('names the lesson by its place in the topic', () => {
    expect(skippedMessage(path(2), 'lesson')).toBe('Lesson 2 skipped');
  });

  it('says just "Lesson skipped" when the lesson has no place', () => {
    expect(skippedMessage(path(), 'lesson')).toBe('Lesson skipped');
  });

  it('names the topic or the level when that is what was skipped', () => {
    expect(skippedMessage(path(2), 'topic')).toBe('Topic skipped');
    expect(skippedMessage(path(2), 'level')).toBe('Level skipped');
  });
});
