import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

/**
 * Foreground seconds on the lesson flow (079e): counts only while the app is active, so a
 * backgrounded app adds nothing. `seconds()` is whole seconds; `reset()` restarts the count.
 */
export function useLessonClock() {
  const accumulatedMs = useRef(0);
  const activeSince = useRef<number | null>(AppState.currentState === 'active' ? Date.now() : null);

  useEffect(() => {
    const sync = (state: string) => {
      if (state === 'active') {
        if (activeSince.current === null) activeSince.current = Date.now();
      } else if (activeSince.current !== null) {
        accumulatedMs.current += Date.now() - activeSince.current;
        activeSince.current = null;
      }
    };
    sync(AppState.currentState);
    const subscription = AppState.addEventListener('change', sync);
    return () => subscription.remove();
  }, []);

  const seconds = useCallback(() => {
    const live = activeSince.current === null ? 0 : Date.now() - activeSince.current;
    return Math.round((accumulatedMs.current + live) / 1000);
  }, []);

  const reset = useCallback(() => {
    accumulatedMs.current = 0;
    if (activeSince.current !== null) activeSince.current = Date.now();
  }, []);

  return { seconds, reset };
}
