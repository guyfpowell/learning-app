import { act, renderHook } from '@testing-library/react-native';
import { useAutoDismiss } from '../useAutoDismiss';

const MS = 1000;

function setup(initial: unknown) {
  const onTimeout = jest.fn();
  const hook = renderHook(({ trigger }: { trigger: unknown }) => useAutoDismiss(trigger, () => onTimeout(), MS), {
    initialProps: { trigger: initial },
  });
  return { onTimeout, hook };
}

describe('useAutoDismiss', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('runs the callback once the wait is over, not before', () => {
    const { onTimeout } = setup('shown');

    act(() => { jest.advanceTimersByTime(MS - 1); });
    expect(onTimeout).not.toHaveBeenCalled();
    act(() => { jest.advanceTimersByTime(1); });
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('does nothing while the trigger is falsy', () => {
    const { onTimeout } = setup(null);

    act(() => { jest.advanceTimersByTime(MS * 2); });
    expect(onTimeout).toHaveBeenCalledTimes(0);
  });

  it('restarts the wait when the trigger changes to another truthy value', () => {
    const { onTimeout, hook } = setup('first');

    act(() => { jest.advanceTimersByTime(MS - 1); });
    hook.rerender({ trigger: 'second' });
    act(() => { jest.advanceTimersByTime(MS - 1); });
    expect(onTimeout).toHaveBeenCalledTimes(0);
    act(() => { jest.advanceTimersByTime(1); });
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('cancels the wait when the trigger turns falsy or the screen unmounts', () => {
    const { onTimeout, hook } = setup('shown');

    hook.rerender({ trigger: null });
    act(() => { jest.advanceTimersByTime(MS); });
    hook.rerender({ trigger: 'again' });
    hook.unmount();
    act(() => { jest.advanceTimersByTime(MS); });
    expect(onTimeout).toHaveBeenCalledTimes(0);
  });

  it('keeps the wait running when only the callback changes', () => {
    const { onTimeout, hook } = setup('shown');

    act(() => { jest.advanceTimersByTime(MS - 1); });
    hook.rerender({ trigger: 'shown' });
    act(() => { jest.advanceTimersByTime(1); });
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });
});
