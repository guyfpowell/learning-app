import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { CAIRN_COUNT, CairnLevel } from '../CairnLevel';

function state(i: number): 'filled' | 'outline' | 'missing' {
  if (screen.queryByTestId(`cairn-${i}-filled`)) return 'filled';
  if (screen.queryByTestId(`cairn-${i}-outline`)) return 'outline';
  return 'missing';
}

describe('CairnLevel', () => {
  it.each([1, 2, 3, 4, 5])('level %i fills that many cairns, from the smallest, and outlines the rest', (level) => {
    render(<CairnLevel level={level} />);
    const states = Array.from({ length: CAIRN_COUNT }, (_, i) => state(i));
    const expected = Array.from({ length: CAIRN_COUNT }, (_, i) => (i < level ? 'filled' : 'outline'));
    expect(states).toEqual(expected);
  });

  it('draws the cairns larger one after the next', () => {
    render(<CairnLevel level={2} />);
    const widths = Array.from({ length: CAIRN_COUNT }, (_, i) => {
      const cairn = screen.getByTestId(state(i) === 'filled' ? `cairn-${i}-filled` : `cairn-${i}-outline`);
      return StyleSheet.flatten(cairn.props.style).width as number;
    });
    expect(widths).toEqual([...widths].sort((a, b) => a - b));
    expect(new Set(widths).size).toBe(CAIRN_COUNT);
  });

  it('stands every stone on one line, so they get taller left to right', () => {
    render(<CairnLevel level={2} />);
    expect(StyleSheet.flatten(screen.getByTestId('cairn-level').props.style).alignItems).toBe('flex-end');
    const heights = Array.from({ length: CAIRN_COUNT }, (_, i) => {
      const cairn = screen.getByTestId(state(i) === 'filled' ? `cairn-${i}-filled` : `cairn-${i}-outline`);
      return StyleSheet.flatten(cairn.props.style).height as number;
    });
    expect(heights).toEqual([...heights].sort((a, b) => a - b));
    expect(new Set(heights).size).toBe(CAIRN_COUNT);
  });

  it('says the level for screen readers', () => {
    render(<CairnLevel level={3} />);
    expect(screen.getByLabelText('Level 3 of 5')).toBeTruthy();
  });

  it('keeps a level outside 1 to 5 in range', () => {
    render(<CairnLevel level={9} />);
    expect(screen.getByLabelText('Level 5 of 5')).toBeTruthy();
    expect(state(4)).toBe('filled');
  });
});
