import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NoTrackNotice } from '../NoTrackNotice';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe('NoTrackNotice', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the notice with a heading and body', () => {
    const { getByTestId, getByText } = render(<NoTrackNotice />);
    expect(getByTestId('no-track-notice')).toBeTruthy();
    expect(getByText('Pick a track to begin')).toBeTruthy();
  });

  it('routes to tracks when the button is pressed', () => {
    const { getByTestId } = render(<NoTrackNotice />);
    fireEvent.press(getByTestId('no-track-browse-btn'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/tracks');
  });

  it('accepts an override body so each screen can say why it needs a track', () => {
    const { getByText } = render(<NoTrackNotice body="Your progress lives here." />);
    expect(getByText('Your progress lives here.')).toBeTruthy();
  });
});
