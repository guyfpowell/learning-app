import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Tag } from '../Tag';

describe('Tag', () => {
  it('renders the label', () => {
    render(<Tag variant="beginner" label="Beginner" />);
    expect(screen.getByText('Beginner')).toBeTruthy();
  });

  it('renders all three difficulty variants without throwing', () => {
    const variants = ['beginner', 'intermediate', 'advanced'] as const;
    variants.forEach((variant) => {
      const { unmount } = render(<Tag variant={variant} label={variant} />);
      expect(screen.getByText(variant)).toBeTruthy();
      unmount();
    });
  });

  it('renders a custom label', () => {
    render(<Tag variant="intermediate" label="Int" />);
    expect(screen.getByText('Int')).toBeTruthy();
  });

  it('accepts a testID', () => {
    render(<Tag variant="advanced" label="Adv" testID="my-tag" />);
    expect(screen.getByTestId('my-tag')).toBeTruthy();
  });
});
