/**
 * Build-review screen — back navigation.
 *
 * 069 Chunk A6: the hand-rolled "Not now" Pressable is gone; the native header
 * carries a real back button with testID="review-back". Back from /build-review
 * should land on /build (canGoBack), or fall to Tracks if the stack is empty.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockCreate = jest.fn();
let mockCanGoBack = false;

const mockDraft = {
  statement: 'I am a senior PM looking to grow',
  sessionId: 'test-session',
  result: {
    description: 'understand what AI tools are',
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
  useCreateTrackPlan: () => ({ mutateAsync: mockCreate, isPending: false }),
}));

import BuildReviewScreen from '../build-review';

/** 076f-unfuck — the user names the path; nothing arrives to prefill it. */
describe('the path name is always typed by the user', () => {
  beforeEach(() => mockCreate.mockReset().mockResolvedValue({ id: 'plan-1' }));

  it('starts blank with the placeholder, capped at 27, description shown beneath', () => {
    render(<BuildReviewScreen />);
    const field = screen.getByTestId('path-name');
    expect(field.props.value).toBe('');
    expect(field.props.placeholder).toBe('Name your path');
    expect(field.props.maxLength).toBe(27);
    expect(screen.getByTestId('path-description').props.children).toBe('understand what AI tools are');
  });

  it('does not save while the name is empty', () => {
    render(<BuildReviewScreen />);
    fireEvent.press(screen.getByTestId('accept-plan'));
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('saves once a name is typed, sending the description with it', async () => {
    render(<BuildReviewScreen />);
    fireEvent.changeText(screen.getByTestId('path-name'), '  AI basics ');
    fireEvent.press(screen.getByTestId('accept-plan'));
    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'AI basics', description: 'understand what AI tools are' }),
    ));
    // Let the save finish navigating, so it cannot leak into the next test.
    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    mockReplace.mockReset();
  });
});

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
