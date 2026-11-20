import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { ALTITUDE_LOAD_ERROR, landmarkInCopy, newLandmarkCopy, type AltitudeResponse } from '@learning/shared';
import { useAltitude } from '@/hooks/useAltitude';
import { STREAK_COPY } from '@/lib/momentum';
import { ALTITUDE_ROUTE } from '@/lib/routes';
import { MomentumCard } from '../MomentumCard';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/hooks/useAltitude', () => ({ useAltitude: jest.fn() }));
// A stub that shows whether the medal was drawn locked; Medal.test.tsx covers the drawing.
jest.mock('@/components/ui/Medal', () => {
  const { View } = jest.requireActual('react-native');
  return {
    Medal: ({ definition, locked }: { definition: { key: string }; locked?: boolean }) => (
      <View testID={`medal-${definition.key}`} accessibilityValue={{ text: locked ? 'locked' : 'coloured' }} />
    ),
  };
});

const altitude: AltitudeResponse = {
  metres: 1_120,
  level: 10,
  nextLevel: { level: 11, startsAt: 1_270, metresToGo: 150 },
  lessonsToNextLevel: 5,
  nextLandmark: { key: 'ben-nevis', name: 'Ben Nevis', height: 1_345, metresToGo: 225, lessonsToGo: 7 },
  newLandmark: null,
};

function setData(data: AltitudeResponse | undefined) {
  (useAltitude as jest.Mock).mockReturnValue({ data });
}

describe('MomentumCard', () => {
  beforeEach(() => mockPush.mockClear());

  it('shows the streak as a flame with its count, and one line for its stage', () => {
    setData(undefined);
    render(<MomentumCard streak={4} />);
    expect(within(screen.getByTestId('streak-chip')).getByText('4')).toBeTruthy();
    expect(screen.getByLabelText('4 day streak')).toBeTruthy();
    expect(STREAK_COPY.building.filter(line => screen.queryByText(line) !== null)).toHaveLength(1);
  });

  it('keeps the same line when the card re-renders, and changes stage with the streak', () => {
    setData(undefined);
    const { rerender } = render(<MomentumCard streak={4} />);
    const shown = STREAK_COPY.building.find(line => screen.queryByText(line) !== null);
    rerender(<MomentumCard streak={5} />);
    expect(screen.getByText(shown ?? '')).toBeTruthy();
    rerender(<MomentumCard streak={0} />);
    expect(screen.getByText('Complete a lesson to start your streak')).toBeTruthy();
  });

  it('shows the level, the metres, the bar and the lessons to the next level', () => {
    setData(altitude);
    render(<MomentumCard streak={1} />);
    const block = within(screen.getByTestId('altitude-block'));
    expect(block.getByText('Level 10')).toBeTruthy();
    expect(block.getByText('1,120m')).toBeTruthy();
    expect(block.getByText('About 5 lessons to Level 11')).toBeTruthy();
    expect(screen.getByTestId('altitude-bar')).toBeTruthy();
  });

  it('shows no caption when the lessons to the next level are null', () => {
    setData({ ...altitude, lessonsToNextLevel: null });
    render(<MomentumCard streak={1} />);
    expect(screen.queryByTestId('altitude-caption')).toBeNull();
    expect(screen.getByText('Level 10')).toBeTruthy();
  });

  it('leaves the altitude block out until altitude has loaded', () => {
    setData(undefined);
    render(<MomentumCard streak={1} />);
    expect(screen.queryByTestId('altitude-block')).toBeNull();
  });

  it('says the altitude could not be loaded, in place of the block, even over an older reading', () => {
    (useAltitude as jest.Mock).mockReturnValue({ data: altitude, isError: true });
    render(<MomentumCard streak={1} />);
    expect(screen.getByText(ALTITUDE_LOAD_ERROR)).toBeTruthy();
    expect(screen.queryByTestId('altitude-block')).toBeNull();
  });

  it('shows the next landmark in the badge slot: its medal in colour, as the design draws it, and "Ben Nevis in 225m"', () => {
    setData(altitude);
    render(<MomentumCard streak={1} />);
    const slot = within(screen.getByTestId('badge-slot'));
    expect(slot.getByTestId('medal-ben-nevis').props.accessibilityValue).toEqual({ text: 'coloured' });
    expect(slot.getByText(landmarkInCopy('Ben Nevis', 225))).toBeTruthy();
  });

  it('puts the badge slot on the caption row of the altitude block, under the bar, never above the level', () => {
    setData(altitude);
    render(<MomentumCard streak={1} />);
    const row = within(screen.getByTestId('altitude-footer'));
    expect(row.getByTestId('altitude-caption')).toBeTruthy();
    expect(row.getByTestId('badge-slot')).toBeTruthy();
  });

  it('still shows the badge slot when there is no caption', () => {
    setData({ ...altitude, lessonsToNextLevel: null });
    render(<MomentumCard streak={1} />);
    expect(within(screen.getByTestId('altitude-footer')).getByTestId('badge-slot')).toBeTruthy();
  });

  it('with a landmark not yet seen, shows its medal and "New: Yr Wyddfa" in place of the next landmark', () => {
    setData({ ...altitude, newLandmark: { key: 'yr-wyddfa', name: 'Yr Wyddfa' } });
    render(<MomentumCard streak={1} />);
    const slot = within(screen.getByTestId('badge-slot'));
    expect(slot.getByTestId('medal-yr-wyddfa').props.accessibilityValue).toEqual({ text: 'coloured' });
    expect(slot.getByText(newLandmarkCopy('Yr Wyddfa'))).toBeTruthy();
    expect(slot.queryByTestId('medal-ben-nevis')).toBeNull();
    expect(slot.queryByText(landmarkInCopy('Ben Nevis', 225))).toBeNull();
  });

  it('shows the new landmark even when there is no next landmark', () => {
    setData({ ...altitude, nextLandmark: null, newLandmark: { key: 'yr-wyddfa', name: 'Yr Wyddfa' } });
    render(<MomentumCard streak={1} />);
    expect(within(screen.getByTestId('badge-slot')).getByText(newLandmarkCopy('Yr Wyddfa'))).toBeTruthy();
  });

  it('shows nothing in the badge slot when nextLandmark is null', () => {
    setData({ ...altitude, nextLandmark: null });
    render(<MomentumCard streak={1} />);
    expect(screen.queryByTestId('badge-slot')).toBeNull();
    expect(screen.getByText('Level 10')).toBeTruthy();
  });

  it('shows nothing in the badge slot when altitude failed to refresh, even over an older reading', () => {
    (useAltitude as jest.Mock).mockReturnValue({ data: altitude, isError: true });
    render(<MomentumCard streak={1} />);
    expect(screen.queryByTestId('badge-slot')).toBeNull();
  });

  it('shows nothing in the badge slot until altitude has loaded', () => {
    setData(undefined);
    render(<MomentumCard streak={1} />);
    expect(screen.queryByTestId('badge-slot')).toBeNull();
  });

  it('shows no mini trail and no achievement line', () => {
    setData(altitude);
    render(<MomentumCard streak={1} />);
    expect(screen.queryByLabelText(/^Level \d of 5$/)).toBeNull();
    expect(screen.queryByTestId('momentum-achievement')).toBeNull();
    expect(screen.queryByText(/^(New|Next up):/)).toBeNull();
  });
  describe('the level block', () => {
    it('opens the Altitude chart from anywhere on it: the level, the caption, the metres, the badge slot and the bar', () => {
      setData(altitude);
      render(<MomentumCard streak={1} />);
      fireEvent.press(screen.getByText('Level 10'));
      fireEvent.press(screen.getByTestId('altitude-caption'));
      fireEvent.press(screen.getByText('1,120m'));
      fireEvent.press(screen.getByTestId('badge-slot'));
      fireEvent.press(screen.getByTestId('altitude-bar'));
      expect(mockPush.mock.calls).toEqual([[ALTITUDE_ROUTE], [ALTITUDE_ROUTE], [ALTITUDE_ROUTE], [ALTITUDE_ROUTE], [ALTITUDE_ROUTE]]);
    });

    it('is one button, named by the text inside it with no label of its own', () => {
      setData(altitude);
      render(<MomentumCard streak={1} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(1);
      expect(buttons[0].props.accessibilityLabel).toBeUndefined();
    });
  });
});
