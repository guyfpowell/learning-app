import { queryOptions } from '@tanstack/react-query';
import type { Lesson } from '@learning/shared';
import { lessonService } from '@/services/lesson.service';
import { lessonQueryKey } from '@/lib/queryKeys';
import { BREADCRUMB_CATEGORY, loggedLoad } from '@/lib/breadcrumbs';

/** The lesson fetch, logged on failure; the screen shows the query's error state. */
function loadLesson(id: string): Promise<Lesson> {
  return loggedLoad(BREADCRUMB_CATEGORY.lesson, 'Lesson load failed', () => lessonService.getLesson(id), { lessonId: id });
}

/** The one key and fetch for a lesson. The lesson screen and the next-lesson preload both use it, so they share a cache entry. */
export function lessonQueryOptions(id: string) {
  return queryOptions({ queryKey: lessonQueryKey(id), queryFn: () => loadLesson(id) });
}
