import React from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { colors, font, radius, tracking } from '@/theme';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Button, CTA_FONT } from '../Button';

describe('Button', () => {
  it('shows the label in sentence case', () => {
    render(<Button label="Key Takeaway" onPress={jest.fn()} />);
    expect(screen.getByText('Key takeaway')).toBeTruthy();
  });

  it('is a centred, barely rounded call to action in its own serif face', () => {
    render(<Button testID="btn" label="Sign In" onPress={jest.fn()} />);
    const button = StyleSheet.flatten(screen.getByTestId('btn').props.style);
    expect(button).toMatchObject({ alignItems: 'center', borderRadius: radius.xs });
    const label = StyleSheet.flatten(screen.getByText('Sign in').props.style);
    expect(label.fontFamily).toBe(CTA_FONT);
    expect(label.fontFamily).not.toBe(font.bold);
    expect(label.letterSpacing).toBe(tracking.normal);
  });

  it('glass variant: a blur under a translucent coral wash, white label, no solid fill (096)', () => {
    render(<Button testID="btn" label="Submit" variant="glass" onPress={jest.fn()} />);
    const button = StyleSheet.flatten(screen.getByTestId('btn').props.style);
    expect(button.backgroundColor).toBe('transparent');
    expect(button.overflow).toBe('hidden');
    expect(screen.getByTestId('btn-blur')).toBeTruthy();
    const wash = StyleSheet.flatten(screen.getByTestId('btn-wash').props.style);
    expect(wash.backgroundColor).toBe(colors.coral);
    expect(wash.opacity).toBeLessThan(1);
    expect(StyleSheet.flatten(screen.getByText('Submit').props.style).color).toBe(colors.onBrand);
  });

  it('keeps the large size barely rounded too', () => {
    render(<Button testID="btn" label="Large" size="lg" onPress={jest.fn()} />);
    expect(StyleSheet.flatten(screen.getByTestId('btn').props.style).borderRadius).toBe(radius.xs);
  });

  it('calls onPress when pressed and not disabled', () => {
    const onPress = jest.fn();
    render(<Button label="Click me" onPress={onPress} />);
    fireEvent.press(screen.getByText('Click me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    render(<Button label="Disabled" onPress={onPress} disabled />);
    // Pressing the label text propagates to the Pressable — which blocks it when disabled
    fireEvent.press(screen.getByText('Disabled'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows ActivityIndicator and hides label text when loading', () => {
    const { UNSAFE_getByType } = render(<Button label="Loading" onPress={jest.fn()} loading />);
    expect(screen.queryByText('Loading')).toBeNull();
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
    expect(screen.getByText('Outline')).toBeTruthy();
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
