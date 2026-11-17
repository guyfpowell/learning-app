import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient } from '@tanstack/react-query';
import * as Sentry from '@sentry/react-native';
import { createTestQueryClient, queryWrapper } from '@/test-utils/queryClient';
import { createStaleTimeTestQueryClient } from '@/test-utils/appQueryClient';
import { must } from '@/test-utils/must';
import { makeLesson } from '@/test-utils/lessons';
import { makeSessionUser } from '@/test-utils/users';
import { usePreloadLesson } from '../usePreloadLesson';
import { useLesson } from '../useLesson';
import { CURRENT_USER_QUERY_KEY, lessonQueryKey } from '@/lib/queryKeys';
import { dehydrateOptionsFor } from '@/lib/offlineWrites';
import { SAFE_WRITES } from '@/lib/safeWrites';
import { lessonService } from '@/services/lesson.service';

jest.mock('@/services/lesson.service', () => ({ lessonService: { getLesson: jest.fn() } }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

const mockGetLesson = lessonService.getLesson as jest.Mock;
const lessonOf = (id: string) => makeLesson({ id, title: `Lesson ${id}` });

/** A test client with the app's staleness, signed in as a free or premium user. */
function clientFor(isPremium: boolean): QueryClient {
  const client = createStaleTimeTestQueryClient();
  client.setQueryData(CURRENT_USER_QUERY_KEY, makeSessionUser({ isPremium }));
  return client;
}

describe('usePreloadLesson (115a)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLesson.mockImplementation((id: string) => Promise.resolve(lessonOf(id)));
  });

  it('requests the lesson once for a premium user, into the lesson screen\'s cache entry', async () => {
    const client = clientFor(true);
    renderHook(() => usePreloadLesson('L2'), { wrapper: queryWrapper(client) });
    await waitFor(() => expect(client.getQueryData(lessonQueryKey('L2'))).toEqual(lessonOf('L2')));
    expect(mockGetLesson).toHaveBeenCalledTimes(1);
    expect(mockGetLesson).toHaveBeenCalledWith('L2');
  });

  it('lets the lesson screen open with the lesson there and no second request', async () => {
    const client = clientFor(true);
    renderHook(() => usePreloadLesson('L2'), { wrapper: queryWrapper(client) });
    await waitFor(() => expect(client.getQueryData(lessonQueryKey('L2'))).toBeDefined());
    const { result } = renderHook(() => useLesson('L2'), { wrapper: queryWrapper(client) });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual(lessonOf('L2'));
    expect(mockGetLesson).toHaveBeenCalledTimes(1);
  });

  it('requests nothing for a free user', () => {
    const client = clientFor(false);
    renderHook(() => usePreloadLesson('L2'), { wrapper: queryWrapper(client) });
    expect(mockGetLesson).not.toHaveBeenCalled();
    expect(client.getQueryData(lessonQueryKey('L2'))).toBeUndefined();
  });

  it('requests nothing before the user has loaded', () => {
    const client = createTestQueryClient();
    renderHook(() => usePreloadLesson('L2'), { wrapper: queryWrapper(client) });
    expect(mockGetLesson).not.toHaveBeenCalled();
  });

  it('requests nothing with no lesson id', () => {
    const client = clientFor(true);
    renderHook(() => usePreloadLesson(null), { wrapper: queryWrapper(client) });
    renderHook(() => usePreloadLesson(undefined), { wrapper: queryWrapper(client) });
    expect(mockGetLesson).not.toHaveBeenCalled();
  });

  it('does not request a fresh cached lesson again', () => {
    const client = clientFor(true);
    client.setQueryData(lessonQueryKey('L2'), lessonOf('L2'));
    renderHook(() => usePreloadLesson('L2'), { wrapper: queryWrapper(client) });
    expect(mockGetLesson).not.toHaveBeenCalled();
  });

  it('does not request again on a re-render, only when the id changes', async () => {
    const client = clientFor(true);
    const { rerender } = renderHook(({ id }: { id: string }) => usePreloadLesson(id), {
      wrapper: queryWrapper(client),
      initialProps: { id: 'L2' },
    });
    await waitFor(() => expect(client.getQueryData(lessonQueryKey('L2'))).toBeDefined());
    rerender({ id: 'L2' });
    expect(mockGetLesson).toHaveBeenCalledTimes(1);
    rerender({ id: 'L3' });
    await waitFor(() => expect(client.getQueryData(lessonQueryKey('L3'))).toBeDefined());
    expect(mockGetLesson).toHaveBeenCalledTimes(2);
  });

  it('shows nothing on a failed preload, then the lesson screen loads it as today', async () => {
    const client = clientFor(true);
    let offline = true;
    mockGetLesson.mockImplementation((id: string) => (offline ? Promise.reject(new Error('offline')) : Promise.resolve(lessonOf(id))));
    const { result } = renderHook(() => usePreloadLesson('L2'), { wrapper: queryWrapper(client) });
    await waitFor(() => expect(client.getQueryState(lessonQueryKey('L2'))?.status).toBe('error'));
    expect(result.current).toBeUndefined();
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({ message: 'Lesson load failed' }));
    offline = false;
    const screen = renderHook(() => useLesson('L2'), { wrapper: queryWrapper(client) });
    await waitFor(() => expect(screen.result.current.data).toEqual(lessonOf('L2')));
  });

  it('adds nothing to what the persister saves', async () => {
    const client = clientFor(true);
    renderHook(() => usePreloadLesson('L2'), { wrapper: queryWrapper(client) });
    await waitFor(() => expect(client.getQueryData(lessonQueryKey('L2'))).toBeDefined());
    const lessonQuery = must(client.getQueryCache().find({ queryKey: lessonQueryKey('L2') }), 'lesson query');
    expect(must(dehydrateOptionsFor(client, SAFE_WRITES).shouldDehydrateQuery, 'rule')(lessonQuery)).toBe(false);
  });
});
