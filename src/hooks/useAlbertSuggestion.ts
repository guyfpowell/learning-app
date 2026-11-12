import { usePaths } from '@/hooks/useTrack';
import { hasAlbertSuggestion } from '@/lib/albertSuggestion';

/** Whether the Albert tab should say there is something to review. Reads the paths the app already holds. */
export function useHasAlbertSuggestion(): boolean {
  return hasAlbertSuggestion(usePaths().data);
}
