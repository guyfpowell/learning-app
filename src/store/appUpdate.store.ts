import { create } from 'zustand';

interface AppUpdateState {
  /** True once the API has turned this version of the app away (`APP_UPDATE_REQUIRED`). */
  required: boolean;
  /** The response interceptor in `api.ts` calls this. There is no way back: only a new version clears it. */
  require: () => void;
}

/**
 * Whether the full-screen "update the app" screen shows (ADR-023 Decision 4). Not persisted and not
 * cleared on sign-out: it is a fact about the installed app, not about the person.
 */
export const useAppUpdateStore = create<AppUpdateState>()((set) => ({
  required: false,
  require: () => set({ required: true }),
}));
