import { useEffect, useEffectEvent } from 'react';
import { useBuild, useBuildPath, useMarkBuildSeen } from '@/hooks/useTrackBuilder';
import { setShownBuildId } from '@/lib/shownBuild';
import { BUILD_PHASE, type BuildProgress } from '@/lib/buildProgress';

/**
 * The build screen's progress: a build started here, else the one opened from a push or the Albert tab
 * (`openedId`), whose words come from the server. The build on screen is the one whose push is not displayed,
 * and a finished build shown here is marked seen, so the badge clears.
 */
export function useBuildScreenProgress(openedId: string | undefined): {
  progress: BuildProgress;
  start: (statement: string) => void;
  openedStatement: string | null;
} {
  const own = useBuildPath();
  const opened = useBuild(openedId);
  const markSeen = useMarkBuildSeen();
  // A build started here takes over from the one opened: "try again" is a new build with its own outcome.
  const progress = own.progress.phase === BUILD_PHASE.idle ? opened.progress : own.progress;

  const shownId = own.buildId ?? openedId ?? null;
  useEffect(() => {
    setShownBuildId(shownId);
    return () => setShownBuildId(null);
  }, [shownId]);

  const finishedId = progress.phase === BUILD_PHASE.finished && !progress.build.seen ? progress.build.id : null;
  const markFinishedSeen = useEffectEvent(() => { if (finishedId !== null) markSeen.mutate(finishedId); });
  useEffect(() => { markFinishedSeen(); }, [finishedId]);

  return { progress, start: own.start, openedStatement: opened.statement };
}
