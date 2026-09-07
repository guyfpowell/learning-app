/**
 * The understanding cloud — Rule 10, 049b Chunk 6, mobile parity.
 *
 * Kept in step with the web test of the same name: the two clients have
 * diverged before, and a rule only one of them obeys is not a rule.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { UnderstandingCloud } from '../UnderstandingCloud';
import type { CloudTerm } from '@/services/trackBuilder.service';

const term = (over: Partial<CloudTerm> & { text: string }): CloudTerm => ({
  kind: 'request', weight: 1, struck: false, request: 'c1', ...over,
});

/** The flattened style react-native applies to a Text node. */
const styleOf = (node: any) =>
  Object.assign({}, ...[node.props.style].flat(Infinity).filter(Boolean));

describe('the understanding cloud', () => {
  it('shows nothing at all before there is anything to show', () => {
    render(<UnderstandingCloud terms={[]} />);
    expect(screen.queryByTestId('understanding-cloud')).toBeNull();
  });

  it('shows the user their own words', () => {
    render(<UnderstandingCloud terms={[
      term({ text: 'roadmaps' }),
      term({ text: 'rusty', kind: 'detail', weight: 0.2 }),
      term({ text: 'fintech', kind: 'context', weight: 0.5 }),
    ]} />);
    expect(screen.getByText('roadmaps')).toBeTruthy();
    expect(screen.getByText('rusty')).toBeTruthy();
    expect(screen.getByText('fintech')).toBeTruthy();
  });

  it('sizes a request above the context beside it', () => {
    // A user seeing their industry come out large is how they catch it being
    // mistaken for their request. It must be smaller, and still be there.
    render(<UnderstandingCloud terms={[
      term({ text: 'roadmaps', weight: 1 }),
      term({ text: 'fintech', kind: 'context', weight: 0.5 }),
    ]} />);
    expect(styleOf(screen.getByText('roadmaps')).fontSize)
      .toBeGreaterThan(styleOf(screen.getByText('fintech')).fontSize);
  });

  it('strikes a negated word through instead of removing it', () => {
    // An exclusion the user cannot see is one they cannot confirm was heard.
    render(<UnderstandingCloud terms={[
      term({ text: 'pricing', struck: true }),
      term({ text: 'roadmaps' }),
    ]} />);
    expect(screen.getByText('pricing')).toBeTruthy();
    expect(styleOf(screen.getByText('pricing')).textDecorationLine).toBe('line-through');
    expect(styleOf(screen.getByText('roadmaps')).textDecorationLine).toBeUndefined();
  });
});
