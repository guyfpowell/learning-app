import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Text } from '../Text';

describe('Text', () => {
  it('shows a plain string as it is', () => {
    render(<Text>Hello there</Text>);
    expect(screen.getByText('Hello there')).toBeTruthy();
  });

  it('shows a string with an em dash replaced', () => {
    render(<Text>The CPO's job — product as a lever</Text>);
    expect(screen.getByText("The CPO's job: product as a lever")).toBeTruthy();
  });

  it('fixes text built from pieces, so a dash in one piece sees the words around it', () => {
    render(<Text>{'Great work '}{'— '}{'your path is done.'}</Text>);
    expect(screen.getByText('Great work. Your path is done.')).toBeTruthy();
  });

  it('fixes the strings around a nested element and leaves the element alone', () => {
    render(<Text>{'Streak — '}<Text testID="inner">bold — bit</Text>{' keep going'}</Text>);
    expect(screen.getByTestId('inner').props.children).toBe('bold: bit');
    expect(screen.queryByText(/—/)).toBeNull();
  });

  it('passes numbers, styles and props through', () => {
    render(<Text testID="t" numberOfLines={2} style={{ color: 'red' }}>{12}%</Text>);
    expect(screen.getByTestId('t').props.numberOfLines).toBe(2);
    expect(screen.getByText('12%')).toBeTruthy();
  });

  it('shows nothing for no children', () => {
    render(<Text testID="empty" />);
    expect(screen.getByTestId('empty')).toBeTruthy();
  });
});
