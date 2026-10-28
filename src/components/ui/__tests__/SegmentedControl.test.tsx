import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SegmentedControl, iconCircleStyle, segmentStyle, type SegmentTone } from '../SegmentedControl';
import { colors } from '@/theme';

type Pick = 'a' | 'b' | 'c';
const LABELS: Record<Pick, string> = { a: 'First one', b: 'Second', c: 'Third' };
const OPTIONS: readonly Pick[] = ['a', 'b', 'c'];
const ICONS: Record<Pick, 'thumbs-up-outline'> = { a: 'thumbs-up-outline', b: 'thumbs-up-outline', c: 'thumbs-up-outline' };
const TONES: Record<Pick, SegmentTone> = { a: 'amber', b: 'success', c: 'violet' };

function setup(picked: Pick | null = null, disabled = false, open = true) {
  const onPick = jest.fn();
  const onOpen = jest.fn();
  render(
    <SegmentedControl
      label="Rate it"
      testIDPrefix="seg"
      options={OPTIONS}
      labels={LABELS}
      icons={ICONS}
      tones={TONES}
      picked={picked}
      open={open}
      onOpen={onOpen}
      disabled={disabled}
      onPick={onPick}
    />,
  );
  return { onPick, onOpen };
}

describe('SegmentedControl', () => {
  it('closed, shows a summary with the picked label and no tiles', () => {
    setup('b', false, false);
    expect(screen.getByText('Rate it')).toBeTruthy();
    expect(screen.getByTestId('seg-summary-value').props.children).toBe('Second');
    expect(screen.queryByTestId('seg-a')).toBeNull();
  });

  it('closed with nothing picked, shows the heading only', () => {
    setup(null, false, false);
    expect(screen.queryByTestId('seg-summary-value')).toBeNull();
  });

  it('closed, pressing the summary asks to open', () => {
    const { onOpen, onPick } = setup('b', false, false);
    fireEvent.press(screen.getByTestId('seg-summary'));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onPick).not.toHaveBeenCalled();
  });

  it('shows every option label in sentence case', () => {
    setup();
    expect(screen.getByText('First one')).toBeTruthy();
    expect(screen.getByText('Second')).toBeTruthy();
    expect(screen.getByText('Third')).toBeTruthy();
  });

  it('reports only the picked segment as selected', () => {
    setup('b');
    expect(screen.getByTestId('seg-a').props.accessibilityState).toEqual({ selected: false, disabled: false });
    expect(screen.getByTestId('seg-b').props.accessibilityState).toEqual({ selected: true, disabled: false });
    expect(screen.getByTestId('seg-c').props.accessibilityState).toEqual({ selected: false, disabled: false });
  });

  it('tints the picked segment with its tone and leaves the others white with the hairline border', () => {
    expect(segmentStyle('success', true, false)).toEqual({ backgroundColor: colors.successSoft, borderColor: colors.success, opacity: 1 });
    expect(segmentStyle('success', false, false)).toEqual({ backgroundColor: colors.surface, borderColor: colors.borderSubtle, opacity: 1 });
  });

  it('gives every tone its own pair of colours', () => {
    expect(segmentStyle('amber', true, false)).toEqual(expect.objectContaining({ backgroundColor: colors.xpSoft, borderColor: colors.xp }));
    expect(segmentStyle('coral', true, false)).toEqual(expect.objectContaining({ backgroundColor: colors.coralSoft, borderColor: colors.coral }));
    expect(segmentStyle('brand', true, false)).toEqual(expect.objectContaining({ backgroundColor: colors.brandSoft, borderColor: colors.brand }));
    expect(segmentStyle('violet', true, false)).toEqual(expect.objectContaining({ backgroundColor: colors.expertSoft, borderColor: colors.expert }));
    expect(segmentStyle('neutral', true, false)).toEqual(expect.objectContaining({ backgroundColor: colors.surfaceSunken, borderColor: colors.textMuted }));
  });

  it('dims a disabled segment', () => {
    expect(segmentStyle('amber', false, true).opacity).toBe(0.5);
  });

  it('the icon circle is the soft tint when unpicked and the strong colour when picked', () => {
    expect(iconCircleStyle('violet', false)).toEqual({ backgroundColor: colors.expertSoft });
    expect(iconCircleStyle('violet', true)).toEqual({ backgroundColor: colors.expert });
  });

  it('shows an icon circle on every segment and no check badge', () => {
    setup('b');
    expect(screen.getByTestId('seg-a-icon')).toBeTruthy();
    expect(screen.getByTestId('seg-b-icon')).toBeTruthy();
    expect(screen.getByTestId('seg-c-icon')).toBeTruthy();
    expect(screen.queryByTestId('seg-b-check')).toBeNull();
  });

  it('picking an option reports it', () => {
    const { onPick } = setup();
    fireEvent.press(screen.getByTestId('seg-c'));
    expect(onPick).toHaveBeenCalledWith('c');
  });

  it('tapping the picked option again reports a clear', () => {
    const { onPick } = setup('a');
    fireEvent.press(screen.getByTestId('seg-a'));
    expect(onPick).toHaveBeenCalledWith(null);
  });

  it('a disabled control reports nothing and marks each segment disabled', () => {
    const { onPick } = setup('a', true);
    fireEvent.press(screen.getByTestId('seg-b'));
    expect(onPick).not.toHaveBeenCalled();
    expect(screen.getByTestId('seg-b').props.accessibilityState).toEqual({ selected: false, disabled: true });
  });
});
