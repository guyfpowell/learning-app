/**
 * Build-review screen — back navigation.
 *
 * 069 Chunk A6: the hand-rolled "Not now" Pressable is gone; the native header
 * carries a real back button with testID="review-back". Back from /build-review
 * should land on /build (canGoBack), or fall to Tracks if the stack is empty.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = false;

const mockDraft = {
  statement: 'I am a senior PM looking to grow',
  sessionId: 'test-session',
  result: {
    name: 'Test path',
    topics: [
      { stableKey: 'topic-1', topicName: 'Strategy basics', level: 'Beginner', reason: 'Career growth', area: 'Strategy', hops: 0 },
    ],
    cloud: [],
    level: 'mid',
    engine: 'claude' as const,
    stoppedAtFloor: false,
    notCovered: null,
    chunks: [],
  },
};

/**
 * Mock Stack.Screen to render headerLeft inline so testIDs are findable.
 */
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: mockReplace,
    back: mockBack,
    canGoBack: () => mockCanGoBack,
  }),
  Stack: {
    Screen: ({ options }: any) => {
      if (options?.headerLeft) {
        const HeaderLeft = options.headerLeft;
        return <HeaderLeft />;
      }
      return null;
    },
  },
}));

jest.mock('@/store/trackBuilder.store', () => ({
  useDraftStore: () => ({
    draft: mockDraft,
    updateResult: jest.fn(),
    clearDraft: jest.fn(),
  }),
}));

jest.mock('@/hooks/useTrackBuilder', () => ({
  useRefinePlan: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useCreateTrackPlan: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

import BuildReviewScreen from '../build-review';

describe('getting out (069 Chunk A6 — native header back)', () => {
  afterEach(() => {
    mockBack.mockReset();
    mockReplace.mockReset();
    mockCanGoBack = false;
  });

  it('pops the stack when there is somewhere to go back to (lands on /build)', () => {
    mockCanGoBack = true;
    render(<BuildReviewScreen />);
    fireEvent.press(screen.getByTestId('review-back'));
    expect(mockBack).toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('falls back to Tracks when the stack is empty', () => {
    mockCanGoBack = false;
    render(<BuildReviewScreen />);
    fireEvent.press(screen.getByTestId('review-back'));
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/tracks');
    expect(mockBack).not.toHaveBeenCalled();
  });
});
