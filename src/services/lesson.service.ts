import api from '@/lib/api';
import type { Lesson } from '@learning/shared';

export const lessonService = {
  async getTodayLesson(): Promise<Lesson> {
    const { data } = await api.get<Lesson>('/lessons/today');
    return data;
  },
};
