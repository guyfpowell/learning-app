import { useQuery } from '@tanstack/react-query';
import { lessonService } from '@/services/lesson.service';

export function useTodayLesson() {
  return useQuery({
    queryKey: ['lesson', 'today'],
    queryFn: () => lessonService.getTodayLesson(),
  });
}
