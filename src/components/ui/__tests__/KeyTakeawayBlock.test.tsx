import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { colors } from '@/theme';
import { TAKEAWAY_DEFAULT_SIZE, TAKEAWAY_MAX_SIZE, TAKEAWAY_MIN_SIZE, TAKEAWAY_STEP } from '@/lib/fitTakeaway';
import { KeyTakeawayBlock } from '../KeyTakeawayBlock';

function setup() {
  render(<KeyTakeawayBlock takeaway="Say the decision first" testID="key-takeaway" />);
}

describe('KeyTakeawayBlock', () => {
  it('has no bar and no box: plain text on the page (096)', () => {
    setup();
    const style = StyleSheet.flatten(screen.getByTestId('key-takeaway').props.style);
    expect([style?.borderLeftWidth, style?.borderLeftColor, style?.backgroundColor, style?.shadowOpacity, style?.elevation])
      .toEqual([undefined, undefined, undefined, undefined, undefined]);
  });

  it('shows the takeaway in the strong text colour', () => {
    setup();
    const style = StyleSheet.flatten(screen.getByText('Say the decision first').props.style);
    expect(style).toEqual(expect.objectContaining({ color: colors.textStrong }));
  });

  describe('fitted size (096)', () => {
    const WIDTH = 300;
    const size = () => StyleSheet.flatten(screen.getByTestId('key-takeaway-text').props.style);
    const layoutWidth = () => fireEvent(screen.getByTestId('key-takeaway'), 'layout', { nativeEvent: { layout: { width: WIDTH, height: 0, x: 0, y: 0 } } });
    const textLayout = (lines: { width: number; height: number }[]) =>
      fireEvent(screen.getByTestId('key-takeaway-text'), 'textLayout', { nativeEvent: { lines } });

    it('starts at the largest size, hidden while it is measured', () => {
      setup();
      layoutWidth();
      expect(size()).toEqual(expect.objectContaining({ fontSize: TAKEAWAY_MAX_SIZE, opacity: 0 }));
    });

    it('steps down while the last line is short, then shows at the size that fills it', () => {
      setup();
      layoutWidth();
      textLayout([{ width: WIDTH, height: 40 }, { width: 60, height: 40 }]);
      expect(size()).toEqual(expect.objectContaining({ fontSize: TAKEAWAY_MAX_SIZE - TAKEAWAY_STEP, opacity: 0 }));
      textLayout([{ width: WIDTH, height: 40 }, { width: WIDTH, height: 40 }]);
      expect(size().fontSize).toBe(TAKEAWAY_MAX_SIZE - TAKEAWAY_STEP);
      expect(size().opacity).toBeUndefined();
    });

    it('ignores a text layout that arrives before the width is known, and stays hidden', () => {
      setup();
      textLayout([{ width: WIDTH, height: 40 }, { width: WIDTH, height: 40 }]);
      expect(size()).toEqual(expect.objectContaining({ fontSize: TAKEAWAY_MAX_SIZE, opacity: 0 }));
    });

    it('measures again from the largest size when the width changes', () => {
      setup();
      layoutWidth();
      textLayout([{ width: WIDTH, height: 40 }, { width: 60, height: 40 }]);
      expect(size().fontSize).toBe(TAKEAWAY_MAX_SIZE - TAKEAWAY_STEP);
      fireEvent(screen.getByTestId('key-takeaway'), 'layout', { nativeEvent: { layout: { width: WIDTH + 50, height: 0, x: 0, y: 0 } } });
      expect(size()).toEqual(expect.objectContaining({ fontSize: TAKEAWAY_MAX_SIZE, opacity: 0 }));
    });

    it('settles on the default size when no size in the range fills the last line', () => {
      setup();
      layoutWidth();
      for (let i = 0; i < (TAKEAWAY_MAX_SIZE - TAKEAWAY_MIN_SIZE) / TAKEAWAY_STEP + 2; i++) {
        textLayout([{ width: WIDTH, height: 40 }, { width: 10, height: 40 }]);
      }
      expect(size().fontSize).toBe(TAKEAWAY_DEFAULT_SIZE);
      expect(size().opacity).toBeUndefined();
    });

    it('steps down when the text is taller than half the window', () => {
      setup();
      layoutWidth();
      const tall = Array.from({ length: 30 }, () => ({ width: WIDTH, height: 40 }));
      textLayout(tall);
      expect(size().fontSize).toBe(TAKEAWAY_MAX_SIZE - TAKEAWAY_STEP);
    });
  });

  it('has no "Key takeaway" label of its own: the header carries it (096)', () => {
    setup();
    expect(screen.queryByText('Key takeaway')).toBeNull();
  });
});
