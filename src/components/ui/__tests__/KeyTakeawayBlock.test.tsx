import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { colors, fontSize, spacing } from '@/theme';
import { KeyTakeawayBlock } from '../KeyTakeawayBlock';

function setup() {
  render(<KeyTakeawayBlock takeaway="Say the decision first" testID="key-takeaway" />);
}

describe('KeyTakeawayBlock', () => {
  it('has no box: a cobalt bar on the left, no fill, no shadow (096)', () => {
    setup();
    const style = StyleSheet.flatten(screen.getByTestId('key-takeaway').props.style);
    expect(style).toEqual(expect.objectContaining({ borderLeftColor: colors.brand, paddingLeft: spacing.md }));
    expect(style.borderLeftWidth).toBeGreaterThan(0);
    expect([style.backgroundColor, style.shadowOpacity, style.elevation]).toEqual([undefined, undefined, undefined]);
  });

  it('shows the takeaway large, in the strong text colour', () => {
    setup();
    const style = StyleSheet.flatten(screen.getByText('Say the decision first').props.style);
    expect(style).toEqual(expect.objectContaining({ color: colors.textStrong, fontSize: fontSize.lg }));
  });

  it('shows the Key takeaway eyebrow in cobalt', () => {
    setup();
    const style = StyleSheet.flatten(screen.getByText('Key takeaway').props.style);
    expect(style).toEqual(expect.objectContaining({ color: colors.brand, textTransform: 'uppercase' }));
  });
});
