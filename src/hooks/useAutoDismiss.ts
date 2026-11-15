import { useEffect, useRef } from 'react';

/**
 * Runs `onTimeout` `ms` after `trigger` turns truthy, for a toast or note that clears itself.
 * A new truthy value restarts the wait; a falsy one, or unmounting, cancels it. `onTimeout` is
 * held in a ref, so an inline callback does not restart the wait.
 */
export function useAutoDismiss(trigger: unknown, onTimeout: () => void, ms: number): void {
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  useEffect(() => {
    if (!trigger) return;
    const timer = setTimeout(() => onTimeoutRef.current(), ms);
    return () => clearTimeout(timer);
  }, [trigger, ms]);
}
