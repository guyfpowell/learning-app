import api from '@/lib/api';
import type { Lesson, LessonPhase, LessonSummary, SaveLessonResponse, SaveLessonPositionRequest } from '@learning/shared';

export const lessonService = {
  async getLesson(id: string): Promise<Lesson> {
    const { data } = await api.get<Lesson>(`/lessons/${id}`);
    return data;
  },

  async saveLesson(lessonId: string): Promise<{ saved: true }> {
    const { data } = await api.post<SaveLessonResponse>(`/lessons/${lessonId}/save`);
    return data;
  },

  async unsaveLesson(lessonId: string): Promise<void> {
    await api.delete(`/lessons/${lessonId}/save`);
  },

  async getSavedLessons(): Promise<LessonSummary[]> {
    const { data } = await api.get<LessonSummary[]>('/lessons/saved');
    return data;
  },

  async updatePosition(lessonId: string, phase: LessonPhase): Promise<void> {
    const body: SaveLessonPositionRequest = { phase };
    await api.patch(`/lessons/${lessonId}/position`, body);
  },
};
