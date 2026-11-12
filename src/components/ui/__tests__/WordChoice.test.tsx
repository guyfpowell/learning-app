import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { WordChoice, wordAlign } from '../WordChoice';

const OPTIONS = ['low', 'mid', 'high'] as const;
const LABELS = { low: 'Too easy', mid: 'About right', high: 'Too hard' };

function setup(picked: (typeof OPTIONS)[number] | null = null, onPick = jest.fn()) {
  render(<WordChoice label="How hard was this topic" testIDPrefix="wc" options={OPTIONS} labels={LABELS} picked={picked} onPick={onPick} />);
  return { onPick };
}

describe('WordChoice', () => {
  it('shows the heading and each word', () => {
    setup();
    expect(screen.getByText('How hard was this topic')).toBeTruthy();
    expect(screen.getByText('Too easy')).toBeTruthy();
    expect(screen.getByText('About right')).toBeTruthy();
    expect(screen.getByText('Too hard')).toBeTruthy();
  });

  it('underlines only the picked word, and announces it as selected', () => {
    setup('mid');
    expect(screen.getByTestId('wc-mid-underline')).toBeTruthy();
    expect(screen.queryByTestId('wc-low-underline')).toBeNull();
    expect(screen.getByTestId('wc-mid').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByTestId('wc-low').props.accessibilityState).toMatchObject({ selected: false });
  });

  it('calls onPick with the word, or null when the picked one is pressed again', () => {
    const { onPick } = setup('mid');
    fireEvent.press(screen.getByTestId('wc-high'));
    expect(onPick).toHaveBeenLastCalledWith('high');
    fireEvent.press(screen.getByTestId('wc-mid'));
    expect(onPick).toHaveBeenLastCalledWith(null);
  });

  it('puts the first word at the left, the last at the right and the rest in the middle', () => {
    expect([0, 1, 2].map(i => wordAlign(i, 3))).toEqual(['flex-start', 'center', 'flex-end']);
  });
});
