import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Lesson, LessonRating } from '@learning/shared';
import { lessonService } from '@/services/lesson.service';
import { lessonQueryKey } from '@/lib/queryKeys';

export function useLesson(id: string) {
  return useQuery({
    queryKey: lessonQueryKey(id),
    queryFn: () => lessonService.getLesson(id),
    enabled: !!id,
  });
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
