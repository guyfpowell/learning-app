import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { SKIP_REASONS, SKIP_REASON_LABELS, SKIP_REASON_QUESTION } from '@learning/shared';
import { SkipReasonPicker, SKIP_PICK_HOLD_MS } from '../SkipReasonPicker';

describe('SkipReasonPicker (079c)', () => {
  it('offers exactly the three reasons, worded from shared, plus Cancel', () => {
    render(<SkipReasonPicker onPick={jest.fn()} onCancel={jest.fn()} />);
    for (const reason of SKIP_REASONS) {
      expect(screen.getByTestId(`skip-reason-${reason}`)).toBeTruthy();
      expect(screen.getByText(new RegExp(`^${SKIP_REASON_LABELS[reason]}$`, 'i'))).toBeTruthy();
    }
    expect(screen.getByText(/^Already know this$/i)).toBeTruthy();
    expect(screen.getByText(/^Not for me$/i)).toBeTruthy();
    expect(screen.getByText(/^Not now$/i)).toBeTruthy();
    expect(screen.getByTestId('skip-reason-cancel')).toBeTruthy();
  });

  it('has no free-text input', () => {
    render(<SkipReasonPicker onPick={jest.fn()} onCancel={jest.fn()} />);
    expect(screen.UNSAFE_queryAllByType(require('react-native').TextInput)).toHaveLength(0);
  });

  it('is headed with what is being skipped and the question', () => {
    render(<SkipReasonPicker title="Skip topic" onPick={jest.fn()} onCancel={jest.fn()} />);
    expect(screen.getByText('Skip topic')).toBeTruthy();
    expect(screen.getByText(SKIP_REASON_QUESTION)).toBeTruthy();
  });

  describe('picking a reason', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it.each(SKIP_REASONS)('%s fills with a tick for a beat, then calls onPick with that reason', reason => {
      const onPick = jest.fn();
      render(<SkipReasonPicker onPick={onPick} onCancel={jest.fn()} />);
      fireEvent.press(screen.getByTestId(`skip-reason-${reason}`));
      expect(screen.getByTestId(`skip-reason-${reason}-tick`)).toBeTruthy();
      expect(onPick).not.toHaveBeenCalled();
      act(() => { jest.advanceTimersByTime(SKIP_PICK_HOLD_MS); });
      expect(onPick).toHaveBeenCalledTimes(1);
      expect(onPick).toHaveBeenCalledWith(reason);
    });

    it('a second tap during the beat does not pick again', () => {
      const onPick = jest.fn();
      render(<SkipReasonPicker onPick={onPick} onCancel={jest.fn()} />);
      fireEvent.press(screen.getByTestId('skip-reason-not_now'));
      fireEvent.press(screen.getByTestId('skip-reason-already_know'));
      act(() => { jest.advanceTimersByTime(SKIP_PICK_HOLD_MS); });
      expect(onPick).toHaveBeenCalledTimes(1);
      expect(onPick).toHaveBeenCalledWith('not_now');
    });
  });

  it('Cancel calls onCancel and never onPick', () => {
    const onPick = jest.fn();
    const onCancel = jest.fn();
    render(<SkipReasonPicker onPick={onPick} onCancel={onCancel} />);
    fireEvent.press(screen.getByTestId('skip-reason-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onPick).not.toHaveBeenCalled();
  });
});
