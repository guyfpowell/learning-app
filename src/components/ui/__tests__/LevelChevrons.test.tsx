import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { LevelChevrons } from '../LevelChevrons';

describe('LevelChevrons', () => {
  it.each(['first', 'second'] as const)('draws the chevrons for %s, hidden from the screen reader', state => {
    render(<LevelChevrons state={state} />);
    const drawing = screen.getByTestId('level-chevrons', { includeHiddenElements: true });
    expect(drawing.props.accessibilityElementsHidden).toBe(true);
    expect(drawing.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('draws nothing, and leaves no space, for none', () => {
    const { toJSON } = render(<LevelChevrons state="none" />);
    expect(toJSON()).toBeNull();
  });
});
