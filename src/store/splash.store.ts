import { create } from 'zustand';
import { DEFAULT_SPLASH, type SplashVariant } from '@/components/splash/splashSteps';

interface SplashState {
  /** Which animation the splash plays. */
  variant: SplashVariant;
  /** True from launch until the splash has faded, and again while the dev switch replays it. */
  showing: boolean;
  /** The dev switch: change the animation and play it. */
  replay: (variant: SplashVariant) => void;
  done: () => void;
}

/**
 * The splash. Deliberately not persisted, and only the dev switch on Profile changes the animation: a launch always
 * shows the default.
 */
export const useSplashStore = create<SplashState>()((set) => ({
  variant: DEFAULT_SPLASH,
  showing: true,
  replay: (variant) => set({ variant, showing: true }),
  done: () => set({ showing: false }),
}));
