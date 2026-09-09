import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { QuizOpt } from '../QuizOpt';

describe('QuizOpt', () => {
  it('renders the key and label', () => {
    render(<QuizOpt optKey="A" label="Revert the redesign" />);
    expect(screen.getByText('A')).toBeTruthy();
    expect(screen.getByText('Revert the redesign')).toBeTruthy();
  });

  it('calls onPress when pressed in idle state', () => {
    const onPress = jest.fn();
    render(<QuizOpt optKey="B" label="Segment the drop" onPress={onPress} />);
    fireEvent.press(screen.getByText('Segment the drop'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when in correct state (answered)', () => {
    const onPress = jest.fn();
    render(<QuizOpt optKey="B" label="Correct answer" state="correct" onPress={onPress} />);
    fireEvent.press(screen.getByText('Correct answer'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not call onPress when in incorrect state (answered)', () => {
    const onPress = jest.fn();
    render(<QuizOpt optKey="C" label="Wrong answer" state="incorrect" onPress={onPress} />);
    fireEvent.press(screen.getByText('Wrong answer'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders all states without throwing', () => {
    const states = ['idle', 'selected', 'correct', 'incorrect'] as const;
    states.forEach((state) => {
      const { unmount } = render(<QuizOpt optKey="A" label="Option" state={state} />);
      expect(screen.getByText('A')).toBeTruthy();
      unmount();
    });
  });

  it('accepts a testID', () => {
    render(<QuizOpt optKey="D" label="Last option" testID="opt-d" />);
    expect(screen.getByTestId('opt-d')).toBeTruthy();
  });
});
