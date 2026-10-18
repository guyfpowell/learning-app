import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { createForegroundClock, type ForegroundClock } from '@learning/shared';

const isActive = (state: AppStateStatus) => state === 'active';

/**
 * Foreground seconds on the lesson flow (079e), counted by the shared clock web uses too, fed by
 * `AppState`: a backgrounded app adds nothing. `seconds()` is whole seconds; `reset()` restarts.
 */
export function useLessonClock(): Pick<ForegroundClock, 'seconds' | 'reset'> {
  const [clock] = useState(() => createForegroundClock(isActive(AppState.currentState)));

  useEffect(() => {
    clock.setForeground(isActive(AppState.currentState));
    const subscription = AppState.addEventListener('change', (state) => clock.setForeground(isActive(state)));
    return () => subscription.remove();
  }, [clock]);

  return clock;
}
