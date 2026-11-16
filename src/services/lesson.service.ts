import api from '@/lib/api';
import { withIdempotencyKey } from '@/lib/idempotencyKey';
import type { Lesson, LessonPhase, LessonRating, SetLessonRatingRequest, LessonSummary, SaveLessonResponse, SaveLessonPositionRequest, StartRetakeResponse } from '@learning/shared';

export const lessonService = {
  async getLesson(id: string): Promise<Lesson> {
    const { data } = await api.get<Lesson>(`/lessons/${id}`);
    return data;
  },

  async saveLesson(lessonId: string, idempotencyKey: string): Promise<{ saved: true }> {
    const { data } = await api.post<SaveLessonResponse>(`/lessons/${lessonId}/save`, undefined, withIdempotencyKey(idempotencyKey));
    return data;
  },

  async unsaveLesson(lessonId: string, idempotencyKey: string): Promise<void> {
    await api.delete(`/lessons/${lessonId}/save`, withIdempotencyKey(idempotencyKey));
  },

  async getSavedLessons(): Promise<LessonSummary[]> {
    const { data } = await api.get<LessonSummary[]>('/lessons/saved');
    return data;
  },

  async startRetake(lessonId: string): Promise<StartRetakeResponse> {
    const { data } = await api.post<StartRetakeResponse>(`/lessons/${lessonId}/retake`);
    return data;
  },

  async updatePosition(lessonId: string, phase: LessonPhase, idempotencyKey: string): Promise<void> {
    const body: SaveLessonPositionRequest = { phase };
    await api.patch(`/lessons/${lessonId}/position`, body, withIdempotencyKey(idempotencyKey));
  },

  async setRating(lessonId: string, rating: LessonRating | null, idempotencyKey: string): Promise<void> {
    const body: SetLessonRatingRequest = { rating };
    await api.put(`/lessons/${lessonId}/rating`, body, withIdempotencyKey(idempotencyKey));
  },
};
