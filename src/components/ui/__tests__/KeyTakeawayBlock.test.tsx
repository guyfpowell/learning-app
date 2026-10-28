import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { colors, radius } from '@/theme';
import { KeyTakeawayBlock } from '../KeyTakeawayBlock';

function setup() {
  render(<KeyTakeawayBlock takeaway="Say the decision first" testID="key-takeaway" />);
}

describe('KeyTakeawayBlock', () => {
  it('is the cobalt hero card', () => {
    setup();
    const style = StyleSheet.flatten(screen.getByTestId('key-takeaway').props.style);
    expect(style).toEqual(expect.objectContaining({ backgroundColor: colors.brand, borderRadius: radius.card }));
  });

  it('shows the takeaway in white', () => {
    setup();
    const style = StyleSheet.flatten(screen.getByText('Say the decision first').props.style);
    expect(style.color).toBe(colors.onBrand);
  });

  it('shows the Key takeaway eyebrow in brandSoft', () => {
    setup();
    const style = StyleSheet.flatten(screen.getByText('Key takeaway').props.style);
    expect(style).toEqual(expect.objectContaining({ color: colors.brandSoft, textTransform: 'uppercase' }));
  });
});
