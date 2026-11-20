import { renderHook, waitFor } from '@testing-library/react-native';
import * as Sentry from '@sentry/react-native';
import { makeWeekSummary } from '@/test-utils/achievements';
import { queryWrapper } from '@/test-utils/queryClient';
import { weekService } from '@/services/week.service';
import { useWeek } from '../useWeek';

jest.mock('@/services/week.service', () => ({ weekService: { getWeek: jest.fn() } }));

const mockWeekService = weekService as jest.Mocked<typeof weekService>;

describe('useWeek', () => {
  it('reads the week', async () => {
    const week = makeWeekSummary({ metresClimbed: 410 });
    mockWeekService.getWeek.mockResolvedValue(week);
    const { result } = renderHook(() => useWeek(), { wrapper: queryWrapper() });
    await waitFor(() => expect(result.current.data).toEqual(week));
  });

  it('logs a failed load and leaves it in the error state', async () => {
    mockWeekService.getWeek.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useWeek(), { wrapper: queryWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({ message: 'Week load failed' }));
  });
});
