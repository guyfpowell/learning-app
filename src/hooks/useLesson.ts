import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { lessonService } from '@/services/lesson.service';

export function useTodayLesson() {
  return useQuery({
    queryKey: ['lesson', 'today'],
    queryFn: () => lessonService.getTodayLesson(),
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
