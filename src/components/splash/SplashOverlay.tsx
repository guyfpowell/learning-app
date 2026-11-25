import { useSplashStore } from '@/store/splash.store';
import { AscentSplash } from './AscentSplash';

/** Mounted at the root, over the app: the splash on every launch, while the screen under it loads (and the dev switch's replay). */
export function SplashOverlay() {
  const { variant, showing, done } = useSplashStore();
  return showing ? <AscentSplash key={variant} variant={variant} onDone={done} /> : null;
}
