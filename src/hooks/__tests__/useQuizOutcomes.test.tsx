import { renderHook, waitFor } from '@testing-library/react-native';
import type { QuizOutcomesResponse } from '@learning/shared';
import { createTestQueryClient, queryWrapper } from '@/test-utils/queryClient';
import { quizService } from '@/services/quiz.service';
import { quizOutcomesQueryKey } from '@/lib/queryKeys';
import * as Sentry from '@sentry/react-native';
import { BREADCRUMB_CATEGORY } from '@/lib/breadcrumbs';
import { useQuizOutcomes } from '../useQuizOutcomes';

jest.mock('@/services/quiz.service', () => ({ quizService: { getOutcomes: jest.fn() } }));
jest.mock('@sentry/react-native', () => ({ addBreadcrumb: jest.fn() }));

const mockGetOutcomes = quizService.getOutcomes as jest.Mock;

function endings(pass: number): QuizOutcomesResponse {
  return { pass, resolved: [], outcomes: {} };
}

describe('useQuizOutcomes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches nothing while the quiz is closed', () => {
    const client = createTestQueryClient();
    renderHook(() => useQuizOutcomes('lesson-1', false), { wrapper: queryWrapper(client) });
    expect(mockGetOutcomes).not.toHaveBeenCalled();
  });

  it('fetches the endings when the quiz opens', async () => {
    mockGetOutcomes.mockResolvedValue(endings(1));
    const client = createTestQueryClient();
    const { result, rerender } = renderHook(({ open }: { open: boolean }) => useQuizOutcomes('lesson-1', open), {
      wrapper: queryWrapper(client),
      initialProps: { open: false },
    });
    rerender({ open: true });
    await waitFor(() => expect(result.current.data).toEqual(endings(1)));
    expect(mockGetOutcomes).toHaveBeenCalledWith('lesson-1');
  });

  it('fetches again at the next open and never gives the earlier open\'s endings', async () => {
    let pass = 1;
    mockGetOutcomes.mockImplementation(async () => endings(pass));
    const client = createTestQueryClient();
    const { result, rerender } = renderHook(({ open }: { open: boolean }) => useQuizOutcomes('lesson-1', open), {
      wrapper: queryWrapper(client),
      initialProps: { open: true },
    });
    await waitFor(() => expect(result.current.data).toEqual(endings(1)));
    rerender({ open: false });
    expect(client.getQueryData(quizOutcomesQueryKey('lesson-1'))).toBeUndefined();
    pass = 2;
    rerender({ open: true });
    expect(result.current.data).toBeUndefined();
    await waitFor(() => expect(result.current.data).toEqual(endings(2)));
  });

  it('logs a failed fetch and leaves no endings', async () => {
    const failure = new Error('network');
    mockGetOutcomes.mockRejectedValue(failure);
    const client = createTestQueryClient();
    const { result } = renderHook(() => useQuizOutcomes('lesson-1', true), { wrapper: queryWrapper(client) });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
      category: BREADCRUMB_CATEGORY.lesson,
      message: 'Quiz outcomes load failed',
      level: 'warning',
      data: { lessonId: 'lesson-1', err: String(failure) },
    });
  });
});
