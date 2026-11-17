import { renderHook } from '@testing-library/react-native';
import { useQuery } from '@tanstack/react-query';
import { createTestQueryClient, queryWrapper } from '@/test-utils/queryClient';
import { makeLesson } from '@/test-utils/lessons';
import { lessonQueryKey } from '@/lib/queryKeys';
import { useRefreshLesson } from '../useRefreshLesson';

describe('useRefreshLesson (115e)', () => {
  it('invalidates the lesson and gives back what the cache then holds', async () => {
    const client = createTestQueryClient();
    const fresh = makeLesson({ id: 'l1', resolvedQuizIds: ['q-1'] });
    client.setQueryData(lessonQueryKey('l1'), makeLesson({ id: 'l1' }));
    // The lesson screen holds the entry open, so the invalidation refetches it.
    const { result } = renderHook(() => {
      useQuery({ queryKey: lessonQueryKey('l1'), queryFn: () => Promise.resolve(fresh) });
      return useRefreshLesson('l1');
    }, { wrapper: queryWrapper(client) });
    await expect(result.current()).resolves.toEqual(fresh);
  });
});
