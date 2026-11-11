import React from 'react';
import { render } from '@testing-library/react-native';
import { Contours, contourPaths } from '@/components/ui/Contours';

describe('contourPaths', () => {
  it('draws one closed path per ring', () => {
    const paths = contourPaths({ cx: 100, cy: 0, rings: 6, innerRadius: 40, ringGap: 28 });
    expect(paths).toHaveLength(6);
    paths.forEach(d => {
      expect(d.startsWith('M')).toBe(true);
      expect(d.endsWith('z')).toBe(true);
    });
  });

  it('draws the same rings for the same seed, and different ones for another', () => {
    const base = { cx: 100, cy: 0, rings: 3, innerRadius: 40, ringGap: 28 };
    expect(contourPaths({ ...base, seed: 4 })).toEqual(contourPaths({ ...base, seed: 4 }));
    expect(contourPaths({ ...base, seed: 4 })).not.toEqual(contourPaths({ ...base, seed: 5 }));
  });
});

describe('Contours', () => {
  it('is hidden from accessibility and does not take touches', () => {
    const { getByTestId } = render(<Contours testID="contours" color="#FFFFFF" opacity={0.13} width={390} height={400} />);
    const node = getByTestId('contours', { includeHiddenElements: true });
    expect(node.props.pointerEvents).toBe('none');
    expect(node.props.accessibilityElementsHidden).toBe(true);
  });
});
