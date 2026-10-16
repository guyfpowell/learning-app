import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Badge, LEVEL_BADGE_VARIANT } from '../Badge';

describe('Badge', () => {
  it('renders the label in uppercase', () => {
    render(<Badge label="success" variant="success" />);
    expect(screen.getByText('SUCCESS')).toBeTruthy();
  });

  it('renders all five variants without throwing', () => {
    const variants = ['success', 'warning', 'error', 'info', 'expert'] as const;
    variants.forEach((variant) => {
      const { unmount } = render(<Badge label={variant} variant={variant} />);
      expect(screen.getByText(variant.toUpperCase())).toBeTruthy();
      unmount();
    });
  });

  it('renders with mixed case label', () => {
    render(<Badge label="In Progress" variant="info" />);
    expect(screen.getByText('IN PROGRESS')).toBeTruthy();
  });

  it('gives expert its own variant, distinct from every other level', () => {
    expect(LEVEL_BADGE_VARIANT.expert).toBe('expert');
    const others = [LEVEL_BADGE_VARIANT.beginner, LEVEL_BADGE_VARIANT.intermediate, LEVEL_BADGE_VARIANT.advanced];
    expect(others).not.toContain(LEVEL_BADGE_VARIANT.expert);
  });
});
