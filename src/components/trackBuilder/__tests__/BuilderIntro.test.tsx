import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { colors } from '@/theme';
import { BuilderIntro } from '../BuilderIntro';

describe('BuilderIntro (090)', () => {
  it('is a cobalt block with a white heading and a light line', () => {
    render(<BuilderIntro heading="A heading" line="A line" lineTestID="the-line" />);
    const flat = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style);
    expect(flat('builder-intro')?.backgroundColor).toBe(colors.brand);
    expect(StyleSheet.flatten(screen.getByText('A heading').props.style)?.color).toBe(colors.onBrand);
    expect(flat('the-line')?.color).toBe(colors.brandSoft);
    expect(screen.getByText('A line')).toBeTruthy();
  });
});
