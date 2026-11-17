import { AppState } from 'react-native';
import { onlineManager, type QueryClient } from '@tanstack/react-query';
import type { UserPath } from '@learning/shared';
import { trackContentsQueryOptions } from '@/lib/trackContentsQuery';
import { proposalQueryOptions } from '@/lib/proposalQuery';

/** The tabs that load the screen a person is likely to open next. */
export type PrefetchScreen = 'tracks' | 'progress' | 'albert';

/** One background load. `prefetchQuery` skips a fresh cache entry and never throws. */
type PrefetchJob = (client: QueryClient) => Promise<void>;

const contentsJob = (path: UserPath): PrefetchJob => (client) => client.prefetchQuery(trackContentsQueryOptions(path.kind, path.id));
const proposalJob = (path: UserPath): PrefetchJob => (client) => client.prefetchQuery(proposalQueryOptions(path.id));

/** Albert opens its custom path's contents and, while the path has a suggestion, the proposal (the section's own rule). */
function albertJobs(paths: UserPath[]): PrefetchJob[] {
  return paths
    .filter((path) => path.kind === 'custom')
    .flatMap((path) => [contentsJob(path), ...(path.hasProposal ? [proposalJob(path)] : [])]);
}

/** Tracks and Progress both open the track screen, which loads the contents of the path tapped. */
const enrolledJobs = (paths: UserPath[]): PrefetchJob[] => paths.map(contentsJob);

const JOBS_BY_SCREEN = {
  tracks: enrolledJobs,
  progress: enrolledJobs,
  albert: albertJobs,
} satisfies Record<PrefetchScreen, (paths: UserPath[]) => PrefetchJob[]>;

/** Background loads are for a foreground app with a connection, never in the background or offline. */
function canPrefetchNow(): boolean {
  return AppState.currentState === 'active' && onlineManager.isOnline();
}

/**
 * Loads what `screen` opens next, one request after another. `isStopped` is read before each, so
 * leaving the tab, going offline or backgrounding the app ends the rest.
 */
export async function prefetchNextScreens(
  client: QueryClient,
  screen: PrefetchScreen,
  paths: UserPath[],
  isStopped: () => boolean,
): Promise<void> {
  for (const job of JOBS_BY_SCREEN[screen](paths)) {
    if (isStopped() || !canPrefetchNow()) return;
    await job(client);
  }
}
