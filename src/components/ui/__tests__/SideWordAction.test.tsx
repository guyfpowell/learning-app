import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Text } from '@/components/ui/Text';
import { SideWordAction } from '@/components/ui/SideWordAction';

describe('SideWordAction', () => {
  it('shows the word beside the button, and presses it', () => {
    const onWordPress = jest.fn();
    render(<SideWordAction word="Skip" color="#fff" onWordPress={onWordPress} wordTestID="word"><Text>Main</Text></SideWordAction>);
    expect(screen.getByText('Main')).toBeTruthy();
    fireEvent.press(screen.getByTestId('word'));
    expect(onWordPress).toHaveBeenCalled();
  });

  it('is the button alone with no word', () => {
    render(<SideWordAction color="#fff" onWordPress={jest.fn()} wordTestID="word"><Text>Main</Text></SideWordAction>);
    expect(screen.getByText('Main')).toBeTruthy();
    expect(screen.queryByTestId('word')).toBeNull();
  });

  it('swaps the word for a spinner while loading, and does not press', () => {
    const onWordPress = jest.fn();
    render(<SideWordAction word="Skip" color="#fff" onWordPress={onWordPress} wordTestID="word" loading><Text>Main</Text></SideWordAction>);
    expect(screen.queryByText('Skip')).toBeNull();
    fireEvent.press(screen.getByTestId('word'));
    expect(onWordPress).not.toHaveBeenCalled();
  });
});
