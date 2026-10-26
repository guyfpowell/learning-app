import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Sentry from '@sentry/react-native';
import { SITUATION_POLL_MS, type SituationChange, type SituationChangeOutcome } from '@learning/shared';
import { createTestQueryClient, queryWrapper } from '@/test-utils/queryClient';
import { situationChangeService } from '@/services/situationChange.service';
import { situationChangeQueryKey } from '@/lib/queryKeys';
import { useCreateSituationChange, useLatestSituationChange } from '../useSituationChange';

jest.mock('@/services/situationChange.service', () => ({
  situationChangeService: { create: jest.fn(), getLatest: jest.fn() },
}));

const mockService = situationChangeService as jest.Mocked<typeof situationChangeService>;

function change(outcome: SituationChangeOutcome): SituationChange {
  return { id: 'sc-1', planId: 'plan-1', text: 'New job', createdAt: '2026-10-26T10:00:00.000Z', outcome };
}

describe('useLatestSituationChange (079h)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });
  afterEach(() => jest.useRealTimers());

  it('does not fetch while disabled (a free user)', () => {
    renderHook(() => useLatestSituationChange('plan-1', false), { wrapper: queryWrapper() });
    expect(mockService.getLatest).not.toHaveBeenCalled();
  });

  it('reads again after the poll interval while the outcome is running, and stops once it settles', async () => {
    let serverLatest = change('running');
    mockService.getLatest.mockImplementation(async () => serverLatest);
    const { result } = renderHook(() => useLatestSituationChange('plan-1', true), { wrapper: queryWrapper() });
    await waitFor(() => expect(result.current.data?.outcome).toBe('running'));

    serverLatest = change('no_change');
    await act(async () => { jest.advanceTimersByTime(SITUATION_POLL_MS); });
    await waitFor(() => expect(result.current.data?.outcome).toBe('no_change'));
    expect(mockService.getLatest).toHaveBeenCalledTimes(2);

    await act(async () => { jest.advanceTimersByTime(SITUATION_POLL_MS * 3); });
    expect(mockService.getLatest).toHaveBeenCalledTimes(2);
  });

  it('logs a failed read without the person\'s words and keeps the error state', async () => {
    mockService.getLatest.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useLatestSituationChange('plan-1', true), { wrapper: queryWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({ category: 'albert', message: 'Situation change load failed' }));
  });
});

describe('useCreateSituationChange (079h)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends the words for the plan and puts the stored change in the latest-change cache', async () => {
    mockService.create.mockResolvedValue(change('running'));
    const client = createTestQueryClient();
    const { result } = renderHook(() => useCreateSituationChange('plan-1'), { wrapper: queryWrapper(client) });

    act(() => result.current.mutate('New job'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockService.create).toHaveBeenCalledWith('plan-1', 'New job');
    expect(client.getQueryData(situationChangeQueryKey('plan-1'))).toEqual(change('running'));
  });

  it('logs a failed send without the person\'s words', async () => {
    mockService.create.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useCreateSituationChange('plan-1'), { wrapper: queryWrapper() });

    act(() => result.current.mutate('New job'));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({ category: 'albert', message: 'Situation change send failed' }));
    expect(JSON.stringify((Sentry.addBreadcrumb as jest.Mock).mock.calls)).not.toContain('New job');
  });
});
