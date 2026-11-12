import { create } from 'zustand';

/** The new-user Home layouts (board 22): the pitch, Albert first, the climb. */
export const NEW_USER_HOME_VARIANTS = ['1a', '1b', '1c'] as const;
export type NewUserHomeVariant = typeof NEW_USER_HOME_VARIANTS[number];

/** What everyone sees until the owner decides (and until variants are offered per user). */
export const DEFAULT_NEW_USER_HOME: NewUserHomeVariant = '1b';

/** The next layout in the list, wrapping round: the dev switch's one tap. */
export function nextNewUserHome(current: NewUserHomeVariant): NewUserHomeVariant {
  return NEW_USER_HOME_VARIANTS[(NEW_USER_HOME_VARIANTS.indexOf(current) + 1) % NEW_USER_HOME_VARIANTS.length];
}

interface NewUserHomeState {
  variant: NewUserHomeVariant;
  setVariant: (variant: NewUserHomeVariant) => void;
}

/**
 * Which new-user Home is shown. Deliberately not persisted, and only the dev switch on Profile changes
 * it: a real build always shows the default. Offering different layouts to different users is a later job.
 */
export const useNewUserHomeStore = create<NewUserHomeState>()((set) => ({
  variant: DEFAULT_NEW_USER_HOME,
  setVariant: (variant) => set({ variant }),
}));
