import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { PremiumSheet } from '../PremiumSheet';
import { PremiumModal } from '../PremiumModal';

describe('PremiumSheet', () => {
  it('shows the title, the line, Upgrade now and Maybe later, with anything extra between', () => {
    render(<PremiumSheet visible title="Premium Content" body="Upgrade to unlock." onUpgrade={jest.fn()} onClose={jest.fn()}><Text>2 previews left</Text></PremiumSheet>);
    expect(screen.getByText('Premium Content')).toBeTruthy();
    expect(screen.getByText('Upgrade to unlock.')).toBeTruthy();
    expect(screen.getByText('2 previews left')).toBeTruthy();
    expect(screen.getByText('Upgrade now')).toBeTruthy();
    expect(screen.getByText('Maybe later')).toBeTruthy();
  });

  it('Upgrade now upgrades and Maybe later closes', () => {
    const onUpgrade = jest.fn();
    const onClose = jest.fn();
    render(<PremiumSheet visible title="t" body="b" onUpgrade={onUpgrade} onClose={onClose} />);
    fireEvent.press(screen.getByTestId('upgrade-now-btn'));
    expect(onUpgrade).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByTestId('dismiss-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows nothing while not visible', () => {
    render(<PremiumSheet visible={false} title="Premium Content" body="b" onUpgrade={jest.fn()} onClose={jest.fn()} />);
    expect(screen.queryByText('Premium Content')).toBeNull();
  });
});

describe('PremiumModal', () => {
  it('uses the sheet with the tracks wording', () => {
    render(<PremiumModal visible onClose={jest.fn()} onUpgrade={jest.fn()} />);
    expect(screen.getByText('Upgrade to unlock unlimited access to all premium tracks.')).toBeTruthy();
  });
});
