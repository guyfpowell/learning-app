import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { TrailheadCard } from '../TrailheadCard';
import {
  TRAILHEAD_STEP_KEYS,
  TRAILHEAD_SUBTITLE,
  TRAILHEAD_TITLE,
  trailheadCountCopy,
  trailheadNextCopy,
} from '@learning/shared';
import { makeTrailhead } from '@/test-utils/achievements';
import { must } from '@/test-utils/must';

const DONE = 4;
const NEXT_KEY = must(TRAILHEAD_STEP_KEYS[DONE], 'the fifth step');
const total = TRAILHEAD_STEP_KEYS.length;

describe('TrailheadCard', () => {
  it('starts collapsed: title, subtitle, the count and the next step', () => {
    const trailhead = makeTrailhead(DONE);
    render(<TrailheadCard trailhead={trailhead} />);
    expect(screen.getByText(TRAILHEAD_TITLE)).toBeTruthy();
    expect(screen.getByText(TRAILHEAD_SUBTITLE)).toBeTruthy();
    expect(screen.getByText(trailheadCountCopy(DONE, total))).toBeTruthy();
    const nextName = must(trailhead.steps[DONE], 'the next step').name;
    expect(screen.getByText(trailheadNextCopy(nextName))).toBeTruthy();
    expect(screen.queryByTestId(`trailhead-step-${NEXT_KEY}-next`)).toBeNull();
  });

  it('tapping the header shows every step in order: done ticked, the next one raised, the rest outlined; tapping again collapses', () => {
    const trailhead = makeTrailhead(DONE);
    render(<TrailheadCard trailhead={trailhead} />);
    fireEvent.press(screen.getByTestId('trailhead-header'));

    const states = TRAILHEAD_STEP_KEYS.map((key, i) => {
      if (i < DONE) return `trailhead-step-${key}-done`;
      return i === DONE ? `trailhead-step-${key}-next` : `trailhead-step-${key}-todo`;
    });
    states.forEach(id => expect(screen.getByTestId(id)).toBeTruthy());
    trailhead.steps.forEach(step => expect(screen.getByText(step.name)).toBeTruthy());
    expect(screen.queryByText(trailheadNextCopy(must(trailhead.steps[DONE], 'the next step').name))).toBeNull();

    fireEvent.press(screen.getByTestId('trailhead-header'));
    states.forEach(id => expect(screen.queryByTestId(id)).toBeNull());
  });

  it('draws each step with its own icon', () => {
    render(<TrailheadCard trailhead={makeTrailhead(DONE)} />);
    fireEvent.press(screen.getByTestId('trailhead-header'));
    TRAILHEAD_STEP_KEYS.forEach(key => expect(screen.getByTestId(`trailhead-icon-${key}`)).toBeTruthy());
  });

  it('shows nothing once the Trailhead is finished', () => {
    render(<TrailheadCard trailhead={makeTrailhead(total, true)} />);
    expect(screen.queryByTestId('trailhead-card')).toBeNull();
    expect(screen.queryByText(TRAILHEAD_TITLE)).toBeNull();
  });
});
