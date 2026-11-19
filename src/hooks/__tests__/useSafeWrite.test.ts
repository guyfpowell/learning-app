import { act, renderHook, waitFor } from '@testing-library/react-native';
import { onlineManager } from '@tanstack/react-query';
import { AxiosError, AxiosHeaders } from 'axios';
import type { SaveLessonResponse } from '@learning/shared';
import { makeRewards } from '@/test-utils/achievements';
import { lessonService } from '@/services/lesson.service';
import { createTestQueryClient, queryWrapper } from '@/test-utils/queryClient';
import { must } from '@/test-utils/must';
import { SAVE_LESSON_WRITE } from '@/lib/safeWrites';
import { lessonWriteScope } from '@/lib/mutationKeys';
import { SAVED_LESSONS_QUERY_KEY } from '@/lib/queryKeys';
import { useSafeWrite } from '../useSafeWrite';

jest.mock('@/services/lesson.service', () => ({ lessonService: { saveLesson: jest.fn() } }));

const mockSave = jest.mocked(lessonService.saveLesson);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function useSave(lessonId: string) {
  return useSafeWrite<{ lessonId: string }, SaveLessonResponse>(SAVE_LESSON_WRITE, lessonWriteScope(lessonId));
}

const REPLY: SaveLessonResponse = { saved: true, rewards: makeRewards() };

describe('useSafeWrite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSave.mockResolvedValue(REPLY);
  });
  afterEach(() => act(() => onlineManager.setOnline(true)));

  it('makes the key at the tap, sends it, and settles with the entry\'s settle step', async () => {
    const client = createTestQueryClient();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useSave('l1'), { wrapper: queryWrapper(client) });

    act(() => result.current.mutate({ lessonId: 'l1' }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockSave).toHaveBeenCalledWith('l1', expect.stringMatching(UUID));
    expect(result.current.data).toEqual(REPLY);
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: SAVED_LESSONS_QUERY_KEY }));
  });

  it('makes a new key for each tap', async () => {
    const { result } = renderHook(() => useSave('l1'), { wrapper: queryWrapper() });

    act(() => result.current.mutate({ lessonId: 'l1' }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    act(() => result.current.mutate({ lessonId: 'l1' }));
    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(2));

    const [first, second] = mockSave.mock.calls.map((call) => call[1]);
    expect(first).toMatch(UUID);
    expect(second).toMatch(UUID);
    expect(first).not.toBe(second);
  });

  it('offline, is pending with no error and sends nothing; online, sends and succeeds', async () => {
    act(() => onlineManager.setOnline(false));
    const { result } = renderHook(() => useSave('l1'), { wrapper: queryWrapper() });

    act(() => result.current.mutate({ lessonId: 'l1' }));
    await waitFor(() => expect(result.current.isPaused).toBe(true));
    expect(result.current.isPending).toBe(true);
    expect(result.current.error).toBeNull();
    expect(mockSave).not.toHaveBeenCalled();

    act(() => onlineManager.setOnline(true));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  it('a final refusal shows as the mutation\'s error and is not retried', async () => {
    const refused = new AxiosError('failed', 'ERR_BAD_REQUEST', undefined, undefined, {
      data: null, status: 404, statusText: '', headers: {}, config: { headers: new AxiosHeaders() },
    });
    mockSave.mockRejectedValue(refused);
    const { result } = renderHook(() => useSave('l1'), { wrapper: queryWrapper() });

    act(() => result.current.mutate({ lessonId: 'l1' }));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(must(result.current.error, 'error')).toBe(refused);
    expect(mockSave).toHaveBeenCalledTimes(1);
  });
});
