import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Sentry from '@sentry/react-native';
import type { Lesson, LessonRating } from '@learning/shared';
import { lessonService } from '@/services/lesson.service';
import { lessonQueryKey } from '@/lib/queryKeys';

export function useLesson(id: string) {
  return useQuery({
    queryKey: lessonQueryKey(id),
    queryFn: () => loadLesson(id),
    enabled: !!id,
  });
}

/** The lesson fetch, logged on failure; the screen shows the query's error state. */
async function loadLesson(id: string): Promise<Lesson> {
  try {
    return await lessonService.getLesson(id);
  } catch (err) {
    Sentry.addBreadcrumb({ category: 'lesson', message: 'Lesson load failed', level: 'warning', data: { lessonId: id, err: String(err) } });
    throw err;
  }
}

export function useStartRetake() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lessonId: string) => lessonService.startRetake(lessonId),
    onSuccess: (_data, lessonId) => {
      // The new pass has nothing answered yet: show it now, then confirm from the server.
      queryClient.setQueryData<Lesson>(lessonQueryKey(lessonId), (lesson) =>
        lesson && { ...lesson, lessonRetakeInProgress: true, resolvedQuizIds: [] });
      return queryClient.invalidateQueries({ queryKey: lessonQueryKey(lessonId) });
    },
  });
}

export function useSaveLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lessonId: string) => lessonService.saveLesson(lessonId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lessons', 'saved'] }),
  });
}

export function useUnsaveLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lessonId: string) => lessonService.unsaveLesson(lessonId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lessons', 'saved'] }),
  });
}

export function useSavedLessons() {
  return useQuery({
    queryKey: ['lessons', 'saved'],
    queryFn: () => lessonService.getSavedLessons(),
  });
}

export function useSetLessonRating() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ lessonId, rating }: { lessonId: string; rating: LessonRating | null }) =>
      lessonService.setRating(lessonId, rating),
    // Keep the cached lesson current so a revisit shows the stored verdict without a refetch.
    onSuccess: (_data, { lessonId, rating }) => {
      queryClient.setQueryData<Lesson>(lessonQueryKey(lessonId), (lesson) => lesson && { ...lesson, rating });
    },
  });
}
