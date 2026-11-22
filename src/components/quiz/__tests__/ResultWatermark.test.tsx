import React from 'react';
import { render } from '@testing-library/react-native';
import { ResultWatermark, watermarkOf } from '@/components/quiz/ResultWatermark';
import { colors, results } from '@/theme';

describe('watermarkOf', () => {
  it('is a white tick on a correct result', () => {
    expect(watermarkOf('correct')).toMatchObject({ color: colors.white });
    expect(watermarkOf('correct').opacity).toBeLessThan(0.2);
    expect(watermarkOf('correct').path).not.toBe(watermarkOf('incorrect').path);
  });

  it('is an ink retry arrow on a retry', () => {
    expect(watermarkOf('retry')).toMatchObject({ color: results.retry.fg });
  });

  it('is a red cross on an incorrect result', () => {
    expect(watermarkOf('incorrect')).toMatchObject({ color: results.incorrect.accent, path: 'M6 6l12 12M18 6 6 18' });
  });
});

describe('ResultWatermark', () => {
  it('draws the glyph for its tone', () => {
    const { getByTestId } = render(<ResultWatermark tone="correct" />);
    expect(getByTestId('quiz-frame-watermark', { includeHiddenElements: true })).toBeTruthy();
  });
});
