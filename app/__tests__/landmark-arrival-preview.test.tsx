import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import LandmarkArrivalPreviewScreen from '../landmark-arrival-preview';
import { ARRIVAL_MS } from '@/components/altitudeChart/arrivalSteps';
import { makeSessionUser } from '@/test-utils/users';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: mockBack, replace: jest.fn(), canGoBack: () => true }) }));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 54, bottom: 0, left: 0, right: 0 }),
}));
const mockUser = makeSessionUser({ name: 'Ada Lovelace' });
jest.mock('@/store/auth.store', () => ({
  useAuthStore: (select: (state: { user: typeof mockUser }) => unknown) => select({ user: mockUser }),
}));

const FRAME_MS = 16;
const WHOLE_MS = Object.values(ARRIVAL_MS).reduce((a, b) => a + b, 0) + FRAME_MS;

describe('LandmarkArrivalPreviewScreen', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('goes back from the landmark card\'s Continue', () => {
    render(<LandmarkArrivalPreviewScreen />);
    for (let elapsed = 0; elapsed < WHOLE_MS; elapsed += FRAME_MS) act(() => { jest.advanceTimersByTime(FRAME_MS); });
    fireEvent.press(screen.getByTestId('achievement-continue-btn'));
    expect(mockBack).toHaveBeenCalled();
  });
});
