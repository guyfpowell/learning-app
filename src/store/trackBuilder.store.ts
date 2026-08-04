import { create } from 'zustand';
import type { BuiltPlan } from '@/services/trackBuilder.service';

/**
 * The in-progress path, between the build screen and the review screen.
 *
 * Deliberately NOT persisted. The web client uses sessionStorage for the same
 * reason: a draft is worth nothing after the app is closed, and the server
 * already holds every turn — that record is what matters, not this.
 */
export interface TrackBuilderDraft {
  statement: string;
  sessionId: string | null;
  result: BuiltPlan;
}

interface DraftState {
  draft: TrackBuilderDraft | null;
  setDraft: (draft: TrackBuilderDraft) => void;
  updateResult: (result: BuiltPlan) => void;
  clearDraft: () => void;
}

export const useDraftStore = create<DraftState>()((set) => ({
  draft: null,
  setDraft: (draft) => set({ draft }),
  updateResult: (result) =>
    set((s) => (s.draft ? { draft: { ...s.draft, result } } : s)),
  clearDraft: () => set({ draft: null }),
}));
