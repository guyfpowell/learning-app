import AsyncStorage from '@react-native-async-storage/async-storage';
import { onlineManager } from '@tanstack/react-query';
import { persistQueryClientRestore } from '@tanstack/react-query-persist-client';
import { waitFor } from '@testing-library/react-native';
import { PATHS_QUERY_KEY, SKILLS_QUERY_KEY } from '@/lib/queryKeys';
import { createTestQueryClient } from '@/test-utils/queryClient';
import { pauseSetActiveWrite } from '@/test-utils/pausedWrite';
import { trackService } from '@/services/track.service';
import { makeCustomPath, makeTrackPath } from '@/test-utils/paths';
import { PERSIST_MAX_AGE_MS, writePersister } from '../offlineWrites';
import { SET_ACTIVE_PATH_WRITE, registerOptimisticWrites } from '../optimisticWrites';

jest.mock('@/services/track.service', () => ({ trackService: { setActivePath: jest.fn() } }));

const mockTrackService = trackService as jest.Mocked<typeof trackService>;
const ref = { kind: 'custom', id: 'p1' } as const;

describe('a write restored after a restart', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockTrackService.setActivePath.mockResolvedValue(undefined);
    await AsyncStorage.clear();
  });
  afterEach(() => onlineManager.setOnline(true));

  async function restart() {
    const restored = createTestQueryClient();
    registerOptimisticWrites(restored);
    await persistQueryClientRestore({ queryClient: restored, persister: writePersister, maxAge: PERSIST_MAX_AGE_MS });
    return restored;
  }

  it('brings back the paths it wrote to, sends the request when online, and runs the refetch on settle', async () => {
    const before = createTestQueryClient();
    const paths = [makeTrackPath({ id: 's1', isActive: false }), makeCustomPath({ id: 'p1', isActive: true })];
    before.setQueryData(PATHS_QUERY_KEY, paths);
    await pauseSetActiveWrite(before, ref);

    const after = await restart();
    expect(after.getQueryData(PATHS_QUERY_KEY)).toEqual(paths);
    const invalidate = jest.spyOn(after, 'invalidateQueries');
    expect(mockTrackService.setActivePath).not.toHaveBeenCalled();

    onlineManager.setOnline(true);
    await after.resumePausedMutations();

    expect(mockTrackService.setActivePath).toHaveBeenCalledWith(ref);
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: PATHS_QUERY_KEY }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: SKILLS_QUERY_KEY });
  });

  it('refuses a saved write that has no path, instead of sending a guess', async () => {
    await expect(Promise.resolve().then(() => SET_ACTIVE_PATH_WRITE.mutationFn({ kind: 'custom' }))).rejects.toThrow('has no path');
    expect(mockTrackService.setActivePath).not.toHaveBeenCalled();
  });
});
