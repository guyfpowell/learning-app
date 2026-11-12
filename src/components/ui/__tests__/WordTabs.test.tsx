import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { WordTabs } from '../WordTabs';

const TABS = [{ key: 'a', label: 'Summary' }, { key: 'b', label: 'Lesson' }, { key: 'c', label: 'Quiz' }] as const;

describe('WordTabs', () => {
  it('underlines only the open tab and announces it as selected', () => {
    render(<WordTabs tabs={TABS} selected="b" onSelect={jest.fn()} color="#123456" testIDPrefix="t" />);
    expect(screen.getByTestId('t-b-underline')).toBeTruthy();
    expect(screen.queryByTestId('t-a-underline')).toBeNull();
    expect(screen.getByTestId('t-b').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByTestId('t-a').props.accessibilityState).toMatchObject({ selected: false });
  });

  it('calls onSelect with the pressed tab, and keeps it open when pressed again', () => {
    const onSelect = jest.fn();
    render(<WordTabs tabs={TABS} selected="a" onSelect={onSelect} color="#123456" testIDPrefix="t" />);
    fireEvent.press(screen.getByTestId('t-c'));
    expect(onSelect).toHaveBeenLastCalledWith('c');
    fireEvent.press(screen.getByTestId('t-a'));
    expect(onSelect).toHaveBeenLastCalledWith('a');
  });
});
