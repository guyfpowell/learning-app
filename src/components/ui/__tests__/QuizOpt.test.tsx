import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { colors, radius } from '@/theme';
import { QuizOpt, quizOptKeyStyle, quizOptKeyTextStyle, quizOptTileStyle } from '../QuizOpt';

describe('QuizOpt', () => {
  it('renders the key and label', () => {
    render(<QuizOpt optKey="A" label="Revert the redesign" />);
    expect(screen.getByText('A')).toBeTruthy();
    expect(screen.getByText('Revert the redesign')).toBeTruthy();
  });

  it('centres the key circle vertically against the label (096)', () => {
    expect(quizOptTileStyle('idle')).toMatchObject({ flexDirection: 'row', alignItems: 'center' });
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

  it('091c: idle is a white tile with a subtle border; picked takes the soft fill, brand border and solid badge', () => {
    expect(quizOptTileStyle('idle')).toMatchObject({
      backgroundColor: colors.surface,
      borderColor: colors.borderSubtle,
      borderWidth: 1,
      borderRadius: radius.md,
    });
    expect(quizOptTileStyle('selected')).toMatchObject({ backgroundColor: colors.brandSoft, borderColor: colors.brand });
    expect(quizOptKeyStyle('selected')).toMatchObject({ backgroundColor: colors.brand });
    expect(quizOptKeyTextStyle('selected')).toMatchObject({ color: colors.onBrand });
  });

  it('091c: the incorrect-after-retry state keeps its red look', () => {
    expect(quizOptTileStyle('incorrect')).toMatchObject({ backgroundColor: colors.errorSoft, borderColor: colors.error });
  });

  it('091c: only the picked state is accessibility-selected', () => {
    const states = ['idle', 'selected', 'correct', 'incorrect'] as const;
    states.forEach((state) => {
      const { unmount } = render(<QuizOpt optKey="A" label="Option" state={state} testID="opt" />);
      expect(screen.getByTestId('opt').props.accessibilityState).toMatchObject({ selected: state === 'selected' });
      unmount();
    });
  });

  it('accepts a testID', () => {
    render(<QuizOpt optKey="D" label="Last option" testID="opt-d" />);
    expect(screen.getByTestId('opt-d')).toBeTruthy();
  });

  it('renders long answer labels without a numberOfLines cap', () => {
    const longLabel =
      'This is a deliberately long answer option that would previously have been truncated ' +
      'after three lines, making the question unanswerable for the user selecting this option.';
    render(<QuizOpt optKey="A" label={longLabel} />);
    const labelEl = screen.getByText(longLabel);
    expect(labelEl.props.numberOfLines).toBeUndefined();
  });
});
