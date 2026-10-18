import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
    onSuccess: (_data, lessonId) => queryClient.invalidateQueries({ queryKey: lessonQueryKey(lessonId) }),
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
