import { useEffect, useState } from 'react';
import { BUILD_WAIT_LONG_MS, BUILD_WAIT_SLOW_MS, BUILD_WAIT_STAGE, type BuildWaitStage } from '@learning/shared';

/**
 * How long a wait has gone on, as one of the shared stages: `normal`, then `slow`, then `long`
 * (thresholds in `@learning/shared`). It starts again whenever `pending` turns on, and is `normal`
 * whenever it is off.
 */
export function useSlowWait(pending: boolean): BuildWaitStage {
  const [stage, setStage] = useState<BuildWaitStage>(BUILD_WAIT_STAGE.normal);

  useEffect(() => {
    setStage(BUILD_WAIT_STAGE.normal);
    if (!pending) return undefined;
    const slow = setTimeout(() => setStage(BUILD_WAIT_STAGE.slow), BUILD_WAIT_SLOW_MS);
    const long = setTimeout(() => setStage(BUILD_WAIT_STAGE.long), BUILD_WAIT_LONG_MS);
    return () => {
      clearTimeout(slow);
      clearTimeout(long);
    };
  }, [pending]);

  return stage;
}
