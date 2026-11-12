import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { colors } from '@/theme';
import { Input } from '../Input';

describe('Input', () => {
  it('renders without label', () => {
    const { toJSON } = render(<Input value="" onChangeText={jest.fn()} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders the label when provided', () => {
    render(<Input label="Email" value="" onChangeText={jest.fn()} />);
    expect(screen.getByText('Email')).toBeTruthy();
  });

  it('shows error message when error prop is provided', () => {
    render(<Input value="" onChangeText={jest.fn()} error="Email is required" />);
    expect(screen.getByText('Email is required')).toBeTruthy();
  });

  it('does not show error message when error is undefined', () => {
    render(<Input value="" onChangeText={jest.fn()} />);
    expect(screen.queryByText('Email is required')).toBeNull();
  });

  it('calls onChangeText when text changes', () => {
    const onChangeText = jest.fn();
    render(<Input value="" onChangeText={onChangeText} placeholder="type here" />);
    fireEvent.changeText(screen.getByPlaceholderText('type here'), 'hello');
    expect(onChangeText).toHaveBeenCalledWith('hello');
  });

  it('renders the placeholder', () => {
    render(<Input value="" onChangeText={jest.fn()} placeholder="Enter email" />);
    expect(screen.getByPlaceholderText('Enter email')).toBeTruthy();
  });

  it('has a ring at rest, a cobalt ring while focused, and its own onFocus and onBlur still run', () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    render(<Input value="" onChangeText={jest.fn()} placeholder="p" onFocus={onFocus} onBlur={onBlur} />);
    const field = () => StyleSheet.flatten(screen.getByPlaceholderText('p').props.style);
    expect(field().borderColor).toBe(colors.border);
    fireEvent(screen.getByPlaceholderText('p'), 'focus');
    expect(field().borderColor).toBe(colors.brand);
    expect(onFocus).toHaveBeenCalledTimes(1);
    fireEvent(screen.getByPlaceholderText('p'), 'blur');
    expect(field().borderColor).toBe(colors.border);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('rings the field in red when it has an error', () => {
    render(<Input value="" onChangeText={jest.fn()} placeholder="p" error="Required" />);
    expect(StyleSheet.flatten(screen.getByPlaceholderText('p').props.style).borderColor).toBe(colors.error);
  });
});
