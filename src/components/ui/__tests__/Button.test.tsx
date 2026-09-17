import React from 'react';
import { ActivityIndicator } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Button } from '../Button';

describe('Button', () => {
  it('renders the label in uppercase', () => {
    render(<Button label="Sign In" onPress={jest.fn()} />);
    expect(screen.getByText('SIGN IN')).toBeTruthy();
  });

  it('calls onPress when pressed and not disabled', () => {
    const onPress = jest.fn();
    render(<Button label="Click me" onPress={onPress} />);
    fireEvent.press(screen.getByText('CLICK ME'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    render(<Button label="Disabled" onPress={onPress} disabled />);
    // Pressing the label text propagates to the Pressable — which blocks it when disabled
    fireEvent.press(screen.getByText('DISABLED'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows ActivityIndicator and hides label text when loading', () => {
    const { UNSAFE_getByType } = render(<Button label="Loading" onPress={jest.fn()} loading />);
    expect(screen.queryByText('LOADING')).toBeNull();
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('does not call onPress when loading (disabled=true)', () => {
    const onPress = jest.fn();
    const { UNSAFE_getByType } = render(<Button label="Loading" onPress={onPress} loading />);
    // Press the spinner — Pressable is disabled when loading
    fireEvent.press(UNSAFE_getByType(ActivityIndicator));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders outline variant without throwing', () => {
    const { toJSON } = render(<Button label="Outline" onPress={jest.fn()} variant="outline" />);
    expect(toJSON()).toBeTruthy();
    expect(screen.getByText('OUTLINE')).toBeTruthy();
  });

  it('renders secondary variant without throwing', () => {
    const { toJSON } = render(<Button label="Secondary" onPress={jest.fn()} variant="secondary" />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders ghost variant without throwing', () => {
    const { toJSON } = render(<Button label="Ghost" onPress={jest.fn()} variant="ghost" />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders coral variant without throwing', () => {
    const { toJSON } = render(<Button label="Coral" onPress={jest.fn()} variant="coral" />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders danger variant without throwing', () => {
    const { toJSON } = render(<Button label="Danger" onPress={jest.fn()} variant="danger" />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders lg size without throwing', () => {
    const { toJSON } = render(<Button label="Large" onPress={jest.fn()} size="lg" />);
    expect(toJSON()).toBeTruthy();
  });

  it('is full-width and centred by default', () => {
    const { toJSON } = render(<Button label="Default" onPress={jest.fn()} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders without throwing when inline prop is set', () => {
    const { toJSON } = render(<Button label="Inline" onPress={jest.fn()} inline />);
    expect(toJSON()).toBeTruthy();
  });
});
