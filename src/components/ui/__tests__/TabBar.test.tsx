import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { TabBar } from '../TabBar';

const TABS = [
  { key: 'a', label: 'Alpha' },
  { key: 'b', label: 'Beta' },
] as const;

describe('TabBar', () => {
  it('shows every tab and marks the selected one', () => {
    render(<TabBar tabs={TABS} selected="b" onSelect={jest.fn()} testIDPrefix="t" />);
    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getByTestId('t-b').props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByTestId('t-a').props.accessibilityState).toEqual({ selected: false });
  });

  it('selects the tab that is tapped', () => {
    const onSelect = jest.fn();
    render(<TabBar tabs={TABS} selected="a" onSelect={onSelect} testIDPrefix="t" />);
    fireEvent.press(screen.getByTestId('t-b'));
    expect(onSelect).toHaveBeenCalledWith('b');
  });
});
