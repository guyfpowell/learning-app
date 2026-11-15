import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useQueryClient } from '@tanstack/react-query';
import * as Sentry from '@sentry/react-native';
import { must } from '@/test-utils/must';
import { createTestQueryClient, queryWrapper } from '@/test-utils/queryClient';
import { useOptimisticMutation } from '../useOptimisticMutation';

const KEY = ['things'] as const;
const MUTATION_KEY = ['set-thing'] as const;
const SCOPE = 'thing-writes';
const FAILURE = 'That did not work. Try again.';

type Deferred = { resolve: () => void; reject: (err: Error) => void };

/** A service call held open by hand, so a test sees the cache while the request is in flight. */
function heldCalls() {
  const calls: { value: string; deferred: Deferred }[] = [];
  const service = jest.fn((value: string) =>
    new Promise<void>((resolve, reject) => { calls.push({ value, deferred: { resolve, reject } }); }));
  return { calls, service };
}

function setup(service: (value: string) => Promise<void>, settle: () => Promise<void> = () => Promise.resolve()) {
  const client = createTestQueryClient();
  client.setQueryData(KEY, 'start');
  const hook = renderHook(
    () => ({
      cache: useQueryClient().getQueryData<string>(KEY),
      mutation: useOptimisticMutation<string, string>({
        write: { mutationKey: MUTATION_KEY, scope: SCOPE, queryKey: KEY, mutationFn: (value) => service(String(value)), settle },
        expected: (_current, value) => value,
        failureMessage: FAILURE,
      }),
    }),
    { wrapper: queryWrapper(client) },
  );
  return { client, hook };
}

/** Waits for every call to settle, so no late cache notification lands after the test. */
async function untilIdle(hook: ReturnType<typeof setup>['hook']) {
  await waitFor(() => expect(hook.result.current.mutation.isInFlight(() => true)).toBe(false));
}

describe('useOptimisticMutation', () => {
  beforeEach(() => jest.clearAllMocks());
  // TanStack Query notifies observers on a zero-delay timer; let the last one land inside act.
  afterEach(async () => { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); }); });

  it('writes the expected state before the call resolves', async () => {
    const { calls, service } = heldCalls();
    const { client, hook } = setup(service);

    act(() => hook.result.current.mutation.mutate('A'));

    await waitFor(() => expect(client.getQueryData(KEY)).toBe('A'));
    expect(calls).toHaveLength(1);
    await act(async () => { must(calls[0], 'first call').deferred.resolve(); });
    await untilIdle(hook);
  });

  it('puts the saved cache back, and returns the failure, when the call is rejected', async () => {
    const { calls, service } = heldCalls();
    const { client, hook } = setup(service);

    act(() => hook.result.current.mutation.mutate('A'));
    await waitFor(() => expect(calls).toHaveLength(1));
    await act(async () => { must(calls[0], 'first call').deferred.reject(new Error('boom')); });

    await waitFor(() => expect(hook.result.current.mutation.failure).toBe(FAILURE));
    expect(client.getQueryData(KEY)).toBe('start');
  });

  it('logs a breadcrumb before it restores the cache', async () => {
    const { calls, service } = heldCalls();
    let cacheAtBreadcrumb: unknown;
    const { client, hook } = setup(service);
    (Sentry.addBreadcrumb as jest.Mock).mockImplementation(() => { cacheAtBreadcrumb = client.getQueryData(KEY); });

    act(() => hook.result.current.mutation.mutate('A'));
    await waitFor(() => expect(calls).toHaveLength(1));
    await act(async () => { must(calls[0], 'first call').deferred.reject(new Error('boom')); });

    await waitFor(() => expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({ category: 'optimistic' })));
    expect(cacheAtBreadcrumb).toBe('A');
  });

  it('runs the settle step on success', async () => {
    const settle = jest.fn(() => Promise.resolve());
    const { calls, service } = heldCalls();
    const { hook } = setup(service, settle);

    act(() => hook.result.current.mutation.mutate('A'));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(settle).not.toHaveBeenCalled();
    await act(async () => { must(calls[0], 'first call').deferred.resolve(); });

    await waitFor(() => expect(settle).toHaveBeenCalledTimes(1));
  });

  it('ends on the second call\'s state, and settles once, after two calls in a row', async () => {
    const settle = jest.fn(() => Promise.resolve());
    const { calls, service } = heldCalls();
    const { client, hook } = setup(service, settle);

    act(() => hook.result.current.mutation.mutate('A'));
    await waitFor(() => expect(client.getQueryData(KEY)).toBe('A'));
    act(() => hook.result.current.mutation.mutate('B'));
    await waitFor(() => expect(client.getQueryData(KEY)).toBe('B'));

    await act(async () => { must(calls[0], 'first call').deferred.resolve(); });
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(client.getQueryData(KEY)).toBe('B');
    expect(settle).not.toHaveBeenCalled();
    await act(async () => { must(calls[1], 'second call').deferred.resolve(); });

    await waitFor(() => expect(settle).toHaveBeenCalledTimes(1));
    expect(client.getQueryData(KEY)).toBe('B');
  });

  it('sends the second request only after the first settles', async () => {
    const { calls, service } = heldCalls();
    const { client, hook } = setup(service);

    act(() => hook.result.current.mutation.mutate('A'));
    await waitFor(() => expect(calls).toHaveLength(1));
    act(() => hook.result.current.mutation.mutate('B'));
    await waitFor(() => expect(client.getQueryData(KEY)).toBe('B'));
    expect(service).toHaveBeenCalledTimes(1);

    await act(async () => { must(calls[0], 'first call').deferred.resolve(); });
    await waitFor(() => expect(service).toHaveBeenCalledTimes(2));
    expect(service.mock.calls.map(([value]) => value)).toEqual(['A', 'B']);
    await act(async () => { must(calls[1], 'second call').deferred.resolve(); });
    await untilIdle(hook);
  });

  it('leaves the second call\'s state when the first is rejected while the second is pending', async () => {
    const settle = jest.fn(() => Promise.resolve());
    const { calls, service } = heldCalls();
    const { client, hook } = setup(service, settle);

    act(() => hook.result.current.mutation.mutate('A'));
    await waitFor(() => expect(calls).toHaveLength(1));
    act(() => hook.result.current.mutation.mutate('B'));
    await waitFor(() => expect(client.getQueryData(KEY)).toBe('B'));

    await act(async () => { must(calls[0], 'first call').deferred.reject(new Error('boom')); });
    await waitFor(() => expect(hook.result.current.mutation.failure).toBe(FAILURE));
    expect(client.getQueryData(KEY)).toBe('B');
    expect(settle).not.toHaveBeenCalled();
    expect(Sentry.addBreadcrumb).not.toHaveBeenCalled();

    await waitFor(() => expect(calls).toHaveLength(2));
    await act(async () => { must(calls[1], 'second call').deferred.resolve(); });
    await waitFor(() => expect(settle).toHaveBeenCalledTimes(1));
  });

  it('reports which variables are in flight, until they settle', async () => {
    const { calls, service } = heldCalls();
    const { hook } = setup(service);

    act(() => hook.result.current.mutation.mutate('A'));
    await waitFor(() => expect(hook.result.current.mutation.isInFlight((value) => value === 'A')).toBe(true));
    expect(hook.result.current.mutation.isInFlight((value) => value === 'B')).toBe(false);

    await act(async () => { must(calls[0], 'first call').deferred.resolve(); });
    await waitFor(() => expect(hook.result.current.mutation.isInFlight((value) => value === 'A')).toBe(false));
  });

  it('clears the failure on dismiss and on the next call', async () => {
    const { calls, service } = heldCalls();
    const { hook } = setup(service);

    act(() => hook.result.current.mutation.mutate('A'));
    await waitFor(() => expect(calls).toHaveLength(1));
    await act(async () => { must(calls[0], 'first call').deferred.reject(new Error('boom')); });
    await waitFor(() => expect(hook.result.current.mutation.failure).toBe(FAILURE));

    act(() => hook.result.current.mutation.dismissFailure());
    expect(hook.result.current.mutation.failure).toBeNull();

    act(() => hook.result.current.mutation.mutate('B'));
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(hook.result.current.mutation.failure).toBeNull();
    await act(async () => { must(calls[1], 'second call').deferred.resolve(); });
    await untilIdle(hook);
  });
});
