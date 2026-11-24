import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ACHIEVEMENTS_BY_KEY, initialsOf, metresLabel } from '@learning/shared';
import { arrivalDemoPlan } from '../arrivalDemo';
import { LandmarkArrival } from '../LandmarkArrival';
import { ARRIVAL_MS } from '../arrivalSteps';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true }) }));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 54, bottom: 0, left: 0, right: 0 }),
}));

const FRAME_MS = 16;
const PLAN = arrivalDemoPlan();
const WHOLE = Object.values(ARRIVAL_MS).reduce((a, b) => a + b, 0) + FRAME_MS;

/** Moves the clock a frame at a time, as the device does: one big jump would run a whole sequence at once. */
function advance(ms: number) {
  for (let elapsed = 0; elapsed < ms; elapsed += FRAME_MS) act(() => { jest.advanceTimersByTime(FRAME_MS); });
}

describe('LandmarkArrival', () => {
  it('skips to the caller when back is pressed', () => {
    const onBack = jest.fn();
    render(<LandmarkArrival plan={PLAN} name="Tom Smith" onBack={onBack} onContinue={jest.fn()} />);
    fireEvent.press(screen.getByTestId('detail-back'));
    expect(onBack).toHaveBeenCalled();
  });

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('opens on the chart where the learner started: the chart draws no marker, the falling bubble shows the starting height, the earned landmark is the Next card, and no landmark card yet', () => {
    render(<LandmarkArrival plan={PLAN} name="Tom Smith" onBack={jest.fn()} onContinue={jest.fn()} />);
    expect(screen.queryByTestId('altitude-marker')).toBeNull();
    expect(screen.getByTestId('arrival-pill')).toBeTruthy();
    expect(screen.getByTestId('altitude-marker-metres').props.children).toBe(metresLabel(PLAN.fromMetres));
    expect(screen.getByTestId('altitude-marker-initials').props.children).toBe(initialsOf('Tom Smith'));
    expect(screen.getByTestId(`landmark-row-${PLAN.unlock.key}`)).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('altitude-marker-level', { includeHiddenElements: true }).props.style).opacity).toBe(0);
    expect(screen.queryByTestId('landmark-unlock')).toBeNull();
  });

  it('shows the new height on the bubble once it has floated up', () => {
    render(<LandmarkArrival plan={PLAN} name="Tom Smith" onBack={jest.fn()} onContinue={jest.fn()} />);
    advance(WHOLE);
    expect(screen.getByTestId('altitude-marker-metres').props.children).toBe(metresLabel(PLAN.toMetres));
  });

  it('ends on the earned landmark\'s full card, whose Continue calls onContinue', () => {
    const onContinue = jest.fn();
    render(<LandmarkArrival plan={PLAN} name="Tom Smith" onBack={jest.fn()} onContinue={onContinue} />);
    advance(WHOLE);
    expect(screen.getByTestId('landmark-unlock-name').props.children).toBe(ACHIEVEMENTS_BY_KEY[PLAN.unlock.key].name);
    fireEvent.press(screen.getByTestId('achievement-continue-btn'));
    expect(onContinue).toHaveBeenCalled();
  });
});
