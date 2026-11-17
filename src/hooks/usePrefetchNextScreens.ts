import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import type { UserPath } from '@learning/shared';
import { prefetchNextScreens, type PrefetchScreen } from '@/lib/nextScreenPrefetch';

/**
 * When the tab comes into focus, loads the data of the screen the person is most likely to open
 * next, so it is there when they tap (115f). Same keys and fetches as the screens' own queries, so
 * a fresh cached entry isn't asked for again; a failure shows nothing (the screen's own load shows
 * its error); nothing is saved to the device.
 */
export function usePrefetchNextScreens(screen: PrefetchScreen, paths: UserPath[] | undefined) {
  const queryClient = useQueryClient();
  useFocusEffect(
    useCallback(() => {
      if (!paths) return;
      let left = false;
      void prefetchNextScreens(queryClient, screen, paths, () => left);
      return () => { left = true; };
    }, [queryClient, screen, paths]),
  );
}
