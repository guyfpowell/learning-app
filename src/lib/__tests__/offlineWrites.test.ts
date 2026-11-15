import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoStateType, type NetInfoState } from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { PATHS_QUERY_KEY } from '@/lib/queryKeys';
import { createTestQueryClient } from '@/test-utils/queryClient';
import { pauseSetActiveWrite, saveToDevice } from '@/test-utils/pausedWrite';
import { must } from '@/test-utils/must';
import { trackService } from '@/services/track.service';
import {
  DiscardedWriteError,
  PERSIST_STORAGE_KEY,
  clearSessionData,
  connectOnlineManager,
  isRetryableWriteError,
  writePersister,
} from '../offlineWrites';
import { SET_ACTIVE_PATH_WRITE } from '../optimisticWrites';

jest.mock('@/services/track.service', () => ({ trackService: { setActivePath: jest.fn() } }));

const mockTrackService = trackService as jest.Mocked<typeof trackService>;
const mockAddListener = NetInfo.addEventListener as jest.Mock;

const ref = { kind: 'custom', id: 'p1' } as const;

function axiosError(code: string, status?: number): AxiosError {
  const response: AxiosResponse | undefined = status === undefined
    ? undefined
    : { data: null, status, statusText: '', headers: {}, config: { headers: new AxiosHeaders() } };
  return new AxiosError('failed', code, undefined, undefined, response);
}

const cellular = (isInternetReachable: boolean): NetInfoState => ({
  type: NetInfoStateType.cellular,
  isConnected: true,
  isInternetReachable,
  details: { isConnectionExpensive: true, cellularGeneration: null, carrier: null },
});
const disconnected: NetInfoState = { type: NetInfoStateType.none, isConnected: false, isInternetReachable: false, details: null };
const unknown: NetInfoState = { type: NetInfoStateType.unknown, isConnected: null, isInternetReachable: null, details: null };

describe('connectOnlineManager', () => {
  afterEach(() => onlineManager.setOnline(true));

  function listener(): (state: NetInfoState) => void {
    connectOnlineManager();
    return must(mockAddListener.mock.calls.at(-1), 'NetInfo subscription')[0];
  }

  it('is offline when NetInfo says there is no connection', () => {
    listener()(disconnected);
    expect(onlineManager.isOnline()).toBe(false);
  });

  it('is offline when connected but the internet is not reachable', () => {
    listener()(cellular(false));
    expect(onlineManager.isOnline()).toBe(false);
  });

  it('is online when connected, and when NetInfo does not know yet', () => {
    const onChange = listener();
    onChange(disconnected);
    onChange(cellular(true));
    expect(onlineManager.isOnline()).toBe(true);
    onChange(disconnected);
    onChange(unknown);
    expect(onlineManager.isOnline()).toBe(true);
  });
});

describe('isRetryableWriteError', () => {
  it.each([
    ['a network error', axiosError('ERR_NETWORK')],
    ['a timeout', axiosError('ECONNABORTED')],
    ['a 500', axiosError('ERR_BAD_RESPONSE', 500)],
    ['a 503', axiosError('ERR_BAD_RESPONSE', 503)],
  ])('retries %s', (_name, error) => expect(isRetryableWriteError(error)).toBe(true));

  it.each([
    ['a 400', axiosError('ERR_BAD_REQUEST', 400)],
    ['a 401', axiosError('ERR_BAD_REQUEST', 401)],
    ['a 404', axiosError('ERR_BAD_REQUEST', 404)],
    ['a 409', axiosError('ERR_BAD_REQUEST', 409)],
    ['an error that is not a request failure', new Error('boom')],
    ['a discarded write', new DiscardedWriteError()],
  ])('never retries %s', (_name, error) => expect(isRetryableWriteError(error)).toBe(false));
});

describe('what is saved to the device', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    onlineManager.setOnline(true);
  });
  afterEach(() => onlineManager.setOnline(true));

  it('saves nothing while no write is paused, even with the paths loaded', async () => {
    const client = createTestQueryClient();
    client.setQueryData(PATHS_QUERY_KEY, [{ id: 'p1' }]);

    await saveToDevice(client);

    expect(await AsyncStorage.getItem(PERSIST_STORAGE_KEY)).toBeNull();
  });

  it('saves a paused write and the paths it writes to, and no other query', async () => {
    const client = createTestQueryClient();
    client.setQueryData(PATHS_QUERY_KEY, [{ id: 'p1' }]);
    client.setQueryData(['lesson', 'l1'], { id: 'l1' });

    await pauseSetActiveWrite(client, ref);

    const saved = must(await writePersister.restoreClient(), 'saved client');
    expect(saved.clientState.mutations.map((m) => m.state.variables)).toEqual([ref]);
    expect(saved.clientState.queries.map((q) => q.queryKey)).toEqual([PATHS_QUERY_KEY]);
  });
});

describe('clearSessionData (sign-out)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockTrackService.setActivePath.mockResolvedValue(undefined);
    await AsyncStorage.clear();
  });
  afterEach(() => onlineManager.setOnline(true));

  it('empties the saved storage and the cache', async () => {
    const client = createTestQueryClient();
    client.setQueryData(PATHS_QUERY_KEY, [{ id: 'p1' }]);
    await pauseSetActiveWrite(client, ref);
    expect(await AsyncStorage.getItem(PERSIST_STORAGE_KEY)).not.toBeNull();

    await clearSessionData(client);

    expect(await AsyncStorage.getItem(PERSIST_STORAGE_KEY)).toBeNull();
    expect(client.getQueryData(PATHS_QUERY_KEY)).toBeUndefined();
    expect(client.getMutationCache().getAll()).toEqual([]);
  });

  it('never sends a paused write when the phone comes back online', async () => {
    const client = createTestQueryClient();
    await pauseSetActiveWrite(client, ref);

    await clearSessionData(client);
    onlineManager.setOnline(true);
    await client.resumePausedMutations();

    expect(mockTrackService.setActivePath).not.toHaveBeenCalled();
  });

  it('stops a discarded write that is retrying from sending again', async () => {
    const client = createTestQueryClient();
    await pauseSetActiveWrite(client, ref);
    const held = must(client.getMutationCache().getAll()[0], 'paused write').state.variables;

    await clearSessionData(client);

    expect(() => SET_ACTIVE_PATH_WRITE.mutationFn(held)).toThrow(DiscardedWriteError);
    expect(mockTrackService.setActivePath).not.toHaveBeenCalled();
  });
});
