import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SectionRule } from '@/components/home/SectionRule';
import { colors } from '@/theme';

describe('SectionRule', () => {
  it('is a one-point line in the faintest border colour', () => {
    render(<SectionRule />);
    const style = StyleSheet.flatten(screen.getByTestId('section-rule', { includeHiddenElements: true }).props.style);
    expect(style.height).toBe(1);
    expect(style.backgroundColor).toBe(colors.borderSubtle);
  });

  it('can leave room below itself', () => {
    render(<SectionRule spaceBelow={16} />);
    expect(StyleSheet.flatten(screen.getByTestId('section-rule', { includeHiddenElements: true }).props.style).marginBottom).toBe(16);
  });
});
