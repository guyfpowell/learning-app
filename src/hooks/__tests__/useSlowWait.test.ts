import { act, renderHook } from '@testing-library/react-native';
import { BUILD_WAIT_LONG_MS, BUILD_WAIT_SLOW_MS, BUILD_WAIT_STAGE } from '@learning/shared';
import { useSlowWait } from '../useSlowWait';

describe('useSlowWait', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const advance = (ms: number) => act(() => { jest.advanceTimersByTime(ms); });

  it('is normal until the slow threshold, slow until the long one, then long', () => {
    const { result } = renderHook(() => useSlowWait(true));
    expect(result.current).toBe(BUILD_WAIT_STAGE.normal);

    advance(BUILD_WAIT_SLOW_MS - 1000);
    expect(result.current).toBe(BUILD_WAIT_STAGE.normal);
    advance(1000);
    expect(result.current).toBe(BUILD_WAIT_STAGE.slow);

    advance(BUILD_WAIT_LONG_MS - BUILD_WAIT_SLOW_MS - 1000);
    expect(result.current).toBe(BUILD_WAIT_STAGE.slow);
    advance(1000);
    expect(result.current).toBe(BUILD_WAIT_STAGE.long);
  });

  it('is normal when nothing is pending, however long it has been', () => {
    const { result } = renderHook(() => useSlowWait(false));
    advance(BUILD_WAIT_LONG_MS * 2);
    expect(result.current).toBe(BUILD_WAIT_STAGE.normal);
  });

  it('goes back to normal when the wait ends', () => {
    const { result, rerender } = renderHook(({ pending }: { pending: boolean }) => useSlowWait(pending), { initialProps: { pending: true } });
    advance(BUILD_WAIT_LONG_MS);
    expect(result.current).toBe(BUILD_WAIT_STAGE.long);

    rerender({ pending: false });
    expect(result.current).toBe(BUILD_WAIT_STAGE.normal);
  });

  it('starts counting again when a new wait begins', () => {
    const { result, rerender } = renderHook(({ pending }: { pending: boolean }) => useSlowWait(pending), { initialProps: { pending: true } });
    advance(BUILD_WAIT_SLOW_MS);
    expect(result.current).toBe(BUILD_WAIT_STAGE.slow);

    rerender({ pending: false });
    rerender({ pending: true });
    expect(result.current).toBe(BUILD_WAIT_STAGE.normal);
    advance(BUILD_WAIT_SLOW_MS);
    expect(result.current).toBe(BUILD_WAIT_STAGE.slow);
  });
});
