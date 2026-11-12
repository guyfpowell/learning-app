import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { AlbertTabIcon } from '../AlbertTabIcon';

describe('AlbertTabIcon', () => {
  it('has no dot when nothing is waiting', () => {
    render(<AlbertTabIcon color="#000" focused={false} badge={false} />);
    expect(screen.queryByTestId('albert-tab-dot')).toBeNull();
  });

  it('shows a dot when Albert has a suggestion for review', () => {
    render(<AlbertTabIcon color="#000" focused badge />);
    expect(screen.getByTestId('albert-tab-dot')).toBeTruthy();
  });
});
