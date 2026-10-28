import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StepSummary } from '../StepSummary';

function setup(value?: string) {
  const onPress = jest.fn();
  render(<StepSummary testID="step" label="Level" value={value} onPress={onPress} />);
  return { onPress };
}

describe('StepSummary', () => {
  it('shows the heading and the answer', () => {
    setup('About right');
    expect(screen.getByText('Level')).toBeTruthy();
    expect(screen.getByText('About right')).toBeTruthy();
  });

  it('shows only the heading when there is no answer', () => {
    setup();
    expect(screen.getByText('Level')).toBeTruthy();
    expect(screen.queryByTestId('step-value')).toBeNull();
  });

  it('is a collapsed button that opens the step when pressed', () => {
    const { onPress } = setup();
    expect(screen.getByTestId('step').props.accessibilityState).toEqual({ expanded: false, disabled: false });
    fireEvent.press(screen.getByTestId('step'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
