import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { FlameIcon, Streak } from '../Streak';

describe('FlameIcon', () => {
  it('renders without throwing', () => {
    const { toJSON } = render(<FlameIcon />);
    expect(toJSON()).toBeTruthy();
  });

  it('accepts a custom size', () => {
    const { toJSON } = render(<FlameIcon size={32} />);
    expect(toJSON()).toBeTruthy();
  });
});

describe('Streak', () => {
  it('renders the count', () => {
    render(<Streak count={14} />);
    expect(screen.getByText('14')).toBeTruthy();
  });

  it('renders count zero without throwing', () => {
    const { toJSON } = render(<Streak count={0} />);
    expect(toJSON()).toBeTruthy();
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('renders in sm size without throwing', () => {
    const { toJSON } = render(<Streak count={7} size="sm" />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders in md size without throwing', () => {
    const { toJSON } = render(<Streak count={7} size="md" />);
    expect(toJSON()).toBeTruthy();
  });
});
