import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, focusManager, onlineManager, useQuery } from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';
import { axiosError } from '@/test-utils/axios';
import { queryWrapper } from '@/test-utils/queryClient';
import { createAppQueryClient } from '@/test-utils/appQueryClient';
import { must } from '@/test-utils/must';
import { QUERY_CLIENT_DEFAULTS, RETRIES, connectFocusManager } from '../offlineWrites';

/**
 * Loads on patchy signal (ADR-021 Decision 3, 105d), on a client built from the app's own
 * defaults: the test client keeps `networkMode: 'always'` so other suites never pause.
 */


const KEY = ['paths'] as const;

function useLoad(client: QueryClient, queryFn: () => Promise<string>) {
  return renderHook(() => useQuery({ queryKey: KEY, queryFn }), { wrapper: queryWrapper(client) });
}

describe('the query defaults', () => {
  beforeEach(() => { jest.clearAllMocks(); act(() => onlineManager.setOnline(true)); });
  afterEach(() => act(() => onlineManager.setOnline(true)));

  it('are networkMode online, so a load waits for signal instead of failing', () => {
    expect(QUERY_CLIENT_DEFAULTS.queries.networkMode).toBe('online');
  });

  it('offline, a query with data keeps it with no error, and refetches when signal returns', async () => {
    const client = createAppQueryClient();
    client.setQueryData(KEY, 'cached');
    const queryFn = jest.fn(() => Promise.resolve('fresh'));
    act(() => onlineManager.setOnline(false));

    const { result } = useLoad(client, queryFn);
    act(() => { void client.invalidateQueries({ queryKey: KEY }); });

    await waitFor(() => expect(result.current.fetchStatus).toBe('paused'));
    expect(result.current.data).toBe('cached');
    expect(result.current.isError).toBe(false);
    expect(queryFn).not.toHaveBeenCalled();

    act(() => onlineManager.setOnline(true));

    await waitFor(() => expect(result.current.data).toBe('fresh'));
  });

  it('offline, a query with no data is paused, not errored', async () => {
    const queryFn = jest.fn(() => Promise.resolve('fresh'));
    act(() => onlineManager.setOnline(false));

    const { result } = useLoad(createAppQueryClient(), queryFn);

    await waitFor(() => expect(result.current.fetchStatus).toBe('paused'));
    expect(result.current.status).toBe('pending');
    expect(result.current.isError).toBe(false);
    expect(queryFn).not.toHaveBeenCalled();
  });

  it('retries a network error, then succeeds with no error', async () => {
    let failed = false;
    const queryFn = jest.fn(() => {
      if (failed) return Promise.resolve('fresh');
      failed = true;
      return Promise.reject(axiosError('ERR_NETWORK'));
    });

    const { result } = useLoad(createAppQueryClient(), queryFn);

    await waitFor(() => expect(result.current.data).toBe('fresh'));
    expect(result.current.isError).toBe(false);
    expect(queryFn).toHaveBeenCalledTimes(2);
  });

  it('never retries a 404', async () => {
    const queryFn = jest.fn(() => Promise.reject(axiosError('ERR_BAD_REQUEST', 404)));

    const { result } = useLoad(createAppQueryClient(), queryFn);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it('a 5xx on every retry errors, as today', async () => {
    const queryFn = jest.fn(() => Promise.reject(axiosError('ERR_BAD_RESPONSE', 503)));

    const { result } = useLoad(createAppQueryClient(), queryFn);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryFn).toHaveBeenCalledTimes(RETRIES + 1);
  });
});

describe('connectFocusManager', () => {
  let handler: ((state: AppStateStatus) => void) | undefined;
  const remove = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      handler = listener;
      return { remove };
    });
    connectFocusManager();
  });
  afterEach(() => {
    focusManager.setEventListener(() => () => {});
    jest.restoreAllMocks();
  });

  it('follows AppState: active is focused, background is not', () => {
    const onChange = must(handler, 'AppState listener');
    act(() => onChange('background'));
    expect(focusManager.isFocused()).toBe(false);
    act(() => onChange('active'));
    expect(focusManager.isFocused()).toBe(true);
  });

  it('reopening the app refetches a stale query', async () => {
    const client = createAppQueryClient();
    const queryFn = jest.fn(() => Promise.resolve('fresh'));
    const { result } = renderHook(() => useQuery({ queryKey: KEY, queryFn, staleTime: 0 }), { wrapper: queryWrapper(client) });
    await waitFor(() => expect(result.current.data).toBe('fresh'));
    expect(queryFn).toHaveBeenCalledTimes(1);
    const onChange = must(handler, 'AppState listener');

    act(() => onChange('background'));
    act(() => onChange('active'));

    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(2));
  });
});
