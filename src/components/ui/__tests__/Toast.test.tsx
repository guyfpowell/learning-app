import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Toast } from '../Toast';

describe('Toast', () => {
  it('renders the message when visible', () => {
    render(<Toast message="Achievement unlocked!" visible />);
    expect(screen.getByText('Achievement unlocked!')).toBeTruthy();
  });

  it('does not render the message when not visible', () => {
    render(<Toast message="Hidden message" visible={false} />);
    expect(screen.queryByText('Hidden message')).toBeNull();
  });

  it('renders all variants without throwing', () => {
    const variants = ['info', 'success', 'warning', 'error'] as const;
    variants.forEach((variant) => {
      const { unmount } = render(<Toast message="Test" visible variant={variant} />);
      expect(screen.getByText('Test')).toBeTruthy();
      unmount();
    });
  });

  it('calls onDismiss when the dismiss button is pressed', () => {
    const onDismiss = jest.fn();
    render(<Toast message="Tap to close" visible onDismiss={onDismiss} />);
    fireEvent.press(screen.getByTestId('toast-dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders without a dismiss handler', () => {
    const { toJSON } = render(<Toast message="No close" visible />);
    expect(toJSON()).toBeTruthy();
  });
});
