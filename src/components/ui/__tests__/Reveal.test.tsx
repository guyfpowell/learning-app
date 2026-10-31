import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { Text } from '@/components/ui/Text';
import { Reveal, revealDelay } from '../Reveal';

describe('revealDelay', () => {
  it('starts after the heading and steps later for each block', () => {
    expect(revealDelay(0)).toBeGreaterThan(0);
    expect(revealDelay(2) - revealDelay(1)).toBe(revealDelay(1) - revealDelay(0));
    expect(revealDelay(1)).toBeGreaterThan(revealDelay(0));
  });
});

describe('Reveal', () => {
  it('holds its children, in the tree from the start so they can be read', () => {
    render(<Reveal delay={0}><Text>Body</Text></Reveal>);
    expect(screen.getByText('Body')).toBeTruthy();
  });

  it('shows at once when motion is reduced', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    render(<Reveal delay={500}><Text>Body</Text></Reveal>);
    await waitFor(() => expect(JSON.stringify(screen.getByTestId('reveal').props.style.opacity)).toBe('1'));
  });
});
