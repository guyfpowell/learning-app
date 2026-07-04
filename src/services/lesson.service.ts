import api from '@/lib/api';
import type { Lesson, LessonSummary } from '@learning/shared';

export const lessonService = {
  async getTodayLesson(): Promise<Lesson> {
    const { data } = await api.get<Lesson>('/lessons/today');
    return data;
  },

  async saveLesson(lessonId: string): Promise<{ saved: true }> {
    const { data } = await api.post<{ saved: true }>(`/lessons/${lessonId}/save`);
    return data;
  },

  async unsaveLesson(lessonId: string): Promise<void> {
    await api.delete(`/lessons/${lessonId}/save`);
  },

  async getSavedLessons(): Promise<LessonSummary[]> {
    const { data } = await api.get<LessonSummary[]>('/lessons/saved');
    return data;
  },
};
