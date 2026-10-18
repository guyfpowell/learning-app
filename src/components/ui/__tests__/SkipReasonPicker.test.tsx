import { render, screen, fireEvent } from '@testing-library/react-native';
import { SKIP_REASONS, SKIP_REASON_LABELS } from '@learning/shared';
import { SkipReasonPicker } from '../SkipReasonPicker';

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

  it.each(SKIP_REASONS)('picking %s calls onPick with that reason', reason => {
    const onPick = jest.fn();
    render(<SkipReasonPicker onPick={onPick} onCancel={jest.fn()} />);
    fireEvent.press(screen.getByTestId(`skip-reason-${reason}`));
    expect(onPick).toHaveBeenCalledWith(reason);
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
