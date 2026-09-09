import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Ring } from '../Ring';

describe('Ring', () => {
  it('renders the default percentage label', () => {
    render(<Ring value={62} />);
    expect(screen.getByText('62%')).toBeTruthy();
  });

  it('renders a custom label', () => {
    render(<Ring value={62} label="2/3" />);
    expect(screen.getByText('2/3')).toBeTruthy();
  });

  it('renders all tone variants without throwing', () => {
    const tones = ['brand', 'coral', 'success'] as const;
    tones.forEach((tone) => {
      const { unmount } = render(<Ring value={50} tone={tone} />);
      expect(render(<Ring value={50} tone={tone} />).toJSON()).toBeTruthy();
      unmount();
    });
  });

  it('renders at 0% without throwing', () => {
    const { toJSON } = render(<Ring value={0} />);
    expect(toJSON()).toBeTruthy();
    expect(screen.getByText('0%')).toBeTruthy();
  });

  it('renders at 100% without throwing', () => {
    const { toJSON } = render(<Ring value={100} />);
    expect(toJSON()).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('accepts a custom size', () => {
    const { toJSON } = render(<Ring value={50} size={120} />);
    expect(toJSON()).toBeTruthy();
  });
});
