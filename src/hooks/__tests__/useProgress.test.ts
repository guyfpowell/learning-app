import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useProgress } from '../useProgress';
import { progressService } from '@/services/progress.service';

jest.mock('@/services/progress.service', () => ({
  progressService: { getProgress: jest.fn() },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

const mockProgressService = progressService as jest.Mocked<typeof progressService>;

const mockStats = {
  totalLessonsCompleted: 5,
  currentStreak: 3,
  averageScore: 82,
  lastLessonDate: new Date('2026-04-13'),
};

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useProgress', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns progress stats on success', async () => {
    mockProgressService.getProgress.mockResolvedValueOnce(mockStats);
    const { result } = renderHook(() => useProgress(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockStats);
  });

  it('is in loading state initially', async () => {
    mockProgressService.getProgress.mockResolvedValueOnce(mockStats);
    const { result } = renderHook(() => useProgress(), { wrapper: makeWrapper() });
    expect(result.current.isLoading).toBe(true);
  });

  it('returns error state on failure', async () => {
    mockProgressService.getProgress.mockRejectedValueOnce(new Error('API error'));
    const { result } = renderHook(() => useProgress(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('calls progressService.getProgress once', async () => {
    mockProgressService.getProgress.mockResolvedValueOnce(mockStats);
    const { result } = renderHook(() => useProgress(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockProgressService.getProgress).toHaveBeenCalledTimes(1);
  });
});
