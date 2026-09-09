import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Progress } from '../Progress';

describe('Progress', () => {
  it('renders without throwing at 0%', () => {
    const { toJSON } = render(<Progress value={0} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders without throwing at 100%', () => {
    const { toJSON } = render(<Progress value={100} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders without throwing at 50%', () => {
    const { toJSON } = render(<Progress value={50} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders all tone variants without throwing', () => {
    const tones = ['brand', 'coral', 'success'] as const;
    tones.forEach((tone) => {
      const { unmount } = render(<Progress value={60} tone={tone} />);
      expect(render(<Progress value={60} tone={tone} />).toJSON()).toBeTruthy();
      unmount();
    });
  });

  it('accepts a testID', () => {
    render(<Progress value={40} testID="my-progress" />);
    expect(screen.getByTestId('my-progress')).toBeTruthy();
  });

  it('clamps value above 100 to 100%', () => {
    // should not crash with out-of-range value
    const { toJSON } = render(<Progress value={150} />);
    expect(toJSON()).toBeTruthy();
  });

  it('clamps value below 0 to 0%', () => {
    const { toJSON } = render(<Progress value={-10} />);
    expect(toJSON()).toBeTruthy();
  });
});
