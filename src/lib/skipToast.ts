import type { SkipScope, UserPath } from '@learning/shared';

/** What the toast says once a skip has gone through: "Lesson 2 skipped", "Topic skipped" or "Level skipped". */
export function skippedMessage(path: UserPath, scope: SkipScope): string {
  if (scope === 'topic') return 'Topic skipped';
  if (scope === 'level') return 'Level skipped';
  const position = path.nextLesson?.lessonIndex;
  return position != null ? `Lesson ${position} skipped` : 'Lesson skipped';
}
