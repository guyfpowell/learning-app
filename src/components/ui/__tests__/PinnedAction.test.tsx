import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { spacing } from '@/theme';
import { PinnedAction, PINNED_ACTION_CLEARANCE } from '../PinnedAction';

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

describe('PinnedAction', () => {
  it('floats its child above the content, at the foot of the screen (096)', () => {
    render(<SafeAreaProvider initialMetrics={METRICS}><PinnedAction><Text>Go</Text></PinnedAction></SafeAreaProvider>);
    const bar = StyleSheet.flatten(screen.getByTestId('pinned-action').props.style);
    expect(bar.position).toBe('absolute');
    expect(bar.bottom).toBe(34 + spacing.sm3);
    expect(screen.getByText('Go')).toBeTruthy();
  });

  it('exports the space a scrolling page must leave so its last line clears the button', () => {
    expect(PINNED_ACTION_CLEARANCE).toBeGreaterThan(52);
  });
});
