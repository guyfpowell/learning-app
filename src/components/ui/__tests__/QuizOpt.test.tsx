import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { colors, press, radius } from '@/theme';
import { QuizOpt, quizOptTileStyle } from '../QuizOpt';

describe('QuizOpt', () => {
  it('renders the label', () => {
    render(<QuizOpt label="Revert the redesign" />);
    expect(screen.getByText('Revert the redesign')).toBeTruthy();
  });

  it('centres the label and the mark against each other', () => {
    expect(quizOptTileStyle('idle')).toMatchObject({ flexDirection: 'row', alignItems: 'center' });
  });

  it('calls onPress when pressed, idle or selected', () => {
    const onPress = jest.fn();
    const { rerender } = render(<QuizOpt label="Segment the drop" onPress={onPress} />);
    fireEvent.press(screen.getByText('Segment the drop'));
    rerender(<QuizOpt label="Segment the drop" state="selected" onPress={onPress} />);
    fireEvent.press(screen.getByText('Segment the drop'));
    expect(onPress).toHaveBeenCalledTimes(2);
  });

  it('does not call onPress when it is ruled out', () => {
    const onPress = jest.fn();
    render(<QuizOpt label="Wrong answer" state="ruledOut" onPress={onPress} />);
    fireEvent.press(screen.getByText('Wrong answer'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('idle is a white tile with a ring and a solid edge; picked turns cobalt with its own edge', () => {
    expect(quizOptTileStyle('idle')).toMatchObject({
      backgroundColor: colors.surface,
      borderColor: colors.borderSubtle,
      borderBottomColor: colors.border,
      borderRadius: radius.md,
    });
    expect(quizOptTileStyle('selected')).toMatchObject({ backgroundColor: colors.brand, borderBottomColor: press.primaryEdge });
  });

  it('shows a tick only when picked, and none when ruled out', () => {
    const { rerender } = render(<QuizOpt label="Option" testID="opt" />);
    expect(screen.queryByTestId('opt-tick')).toBeNull();
    rerender(<QuizOpt label="Option" state="selected" testID="opt" />);
    expect(StyleSheet.flatten(screen.getByText('Option').props.style).color).toBe(colors.white);
    rerender(<QuizOpt label="Option" state="ruledOut" testID="opt" />);
    expect(StyleSheet.flatten(screen.getByText('Option').props.style).textDecorationLine).toBe('line-through');
  });

  it('is marked selected and disabled for screen readers', () => {
    const { rerender } = render(<QuizOpt label="Option" state="selected" testID="opt" />);
    expect(screen.getByTestId('opt').props.accessibilityState).toMatchObject({ selected: true });
    rerender(<QuizOpt label="Option" state="ruledOut" testID="opt" />);
    expect(screen.getByTestId('opt').props.accessibilityState).toMatchObject({ disabled: true });
  });
});
