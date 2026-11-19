import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Lesson, SaveLessonResponse } from '@learning/shared';
import { lessonService } from '@/services/lesson.service';
import { SAVED_LESSONS_QUERY_KEY, lessonQueryKey } from '@/lib/queryKeys';
import { lessonQueryOptions } from '@/lib/lessonQuery';
import { lessonWriteScope } from '@/lib/mutationKeys';
import {
  SAVE_LESSON_WRITE, SAVE_POSITION_WRITE, SET_RATING_WRITE, UNSAVE_LESSON_WRITE,
  type LessonInput, type SavePositionInput, type SetRatingInput,
} from '@/lib/safeWrites';
import { useSafeWrite } from '@/hooks/useSafeWrite';

export function useLesson(id: string) {
  return useQuery({
    ...lessonQueryOptions(id),
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

// The writes below are safe to send again (ADR-021 Decision 4): each waits through a drop, keeps
// its order behind the lesson's other writes, survives a restart, and the server replays a repeat.
// The screen changes nothing ahead of the server; the settle steps are in `safeWrites.ts`.

export function useSaveLesson(lessonId: string) {
  return useSafeWrite<LessonInput, SaveLessonResponse>(SAVE_LESSON_WRITE, lessonWriteScope(lessonId));
}

export function useUnsaveLesson(lessonId: string) {
  return useSafeWrite<LessonInput, void>(UNSAVE_LESSON_WRITE, lessonWriteScope(lessonId));
}

export function useSavedLessons() {
  return useQuery({
    queryKey: SAVED_LESSONS_QUERY_KEY,
    queryFn: () => lessonService.getSavedLessons(),
  });
}

/** The reading position. Fire-and-forget from the screen: a failure is logged there, never shown. */
export function useSavePosition(lessonId: string) {
  return useSafeWrite<SavePositionInput, void>(SAVE_POSITION_WRITE, lessonWriteScope(lessonId));
}

export function useSetLessonRating(lessonId: string) {
  return useSafeWrite<SetRatingInput, void>(SET_RATING_WRITE, lessonWriteScope(lessonId));
}
