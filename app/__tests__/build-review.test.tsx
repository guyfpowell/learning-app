/**
 * Build-review screen — back navigation.
 *
 * 069 Chunk A6: the hand-rolled "Not now" Pressable is gone; the native header
 * carries a real back button with testID="review-back". Back from /build-review
 * should land on /build (canGoBack), or fall to Tracks if the stack is empty.
 */
import React from 'react';
import type { TrackBuilderDraft } from '@/store/trackBuilder.store';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react-native';

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();
let mockUser: { data?: unknown; isLoading: boolean };
const mockCreate = jest.fn();
const mockRefine = jest.fn();
const mockUpdateResult = jest.fn();
const mockClearDraft = jest.fn();
let mockCanGoBack = false;

const mockDraft: TrackBuilderDraft = {
  statement: 'I am a senior PM looking to grow',
  sessionId: 'test-session',
  result: {
    description: 'understand what AI tools are',
    topics: [
      { stableKey: 'topic-1', order: 0, topicName: 'Strategy basics', level: 'Beginner', reason: 'Career growth', area: 'Strategy', hops: 0 },
    ],
    cloud: [],
    level: 'mid',
    levelConfidence: 1,
    intent: 'build',
    intentConfidence: 1,
    firedAreas: [],
    areas: {},
    shouldAsk: false,
    questions: [],
    engine: 'claude',
    stoppedAtFloor: false,
    chunks: [],
  },
};

/**
 * Mock Stack.Screen to render headerLeft inline so testIDs are findable.
 */
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
    canGoBack: () => mockCanGoBack,
  }),
  Stack: {
    Screen: ({ options }: { options?: { headerLeft?: React.ComponentType } }) => {
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
    updateResult: mockUpdateResult,
    clearDraft: mockClearDraft,
  }),
}));

jest.mock('@/hooks/useEmailVerification', () => ({
  useCurrentUser: () => mockUser,
}));

jest.mock('@/hooks/useTrackBuilder', () => ({
  useRefinePlan: () => ({ mutateAsync: mockRefine, isPending: false }),
  useCreateTrackPlan: () => ({ mutateAsync: mockCreate, isPending: false }),
}));

// The follow-up box is hidden behind a flag; it is on here so the box can be tested.
jest.mock('@learning/shared', () => ({
  ...jest.requireActual<typeof import('@learning/shared')>('@learning/shared'),
  PLAN_FOLLOW_UP_ENABLED: true,
}));

import BuildReviewScreen from '../build-review';
import { ERROR_CODES, ERROR_MESSAGES, type RefinedPlan } from '@learning/shared';
import { BUILD_ROUTE, TRACKS_ROUTE } from '@/lib/routes';
import { PAYWALL_ROUTE } from '@/lib/subscriptions';

function setUser(state: 'premium' | 'unspent' | 'spent', capstones = 0) {
  mockUser = {
    isLoading: false,
    data: {
      isPremium: state === 'premium',
      albertAllowance: { used: state === 'unspent' ? 0 : 1, total: 1 },
      freshPathTrial: { capstones, total: 2 },
    },
  };
}

beforeEach(() => setUser('unspent'));

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
    await act(async () => { fireEvent.press(screen.getByTestId('accept-plan')); });
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
    expect(mockReplace).toHaveBeenCalledWith(TRACKS_ROUTE);
    expect(mockBack).not.toHaveBeenCalled();
  });
});

/** 079a — building and reviewing are free; the save spends the allowance. */
describe('the allowance at save (079a)', () => {
  const apiError = (code: string, message = 'server words') =>
    Object.assign(new Error(message), { response: { data: { code, message } } });

  beforeEach(() => {
    mockCreate.mockReset().mockResolvedValue({ id: 'plan-1' });
    mockPush.mockReset();
    mockReplace.mockReset();
  });

  it('lets a free user with the allowance unspent save', () => {
    setUser('unspent');
    render(<BuildReviewScreen />);
    expect(screen.getByTestId('accept-plan')).toBeTruthy();
    expect(screen.queryByTestId('allowance-used')).toBeNull();
  });

  it('lets a premium user save', () => {
    setUser('premium');
    render(<BuildReviewScreen />);
    expect(screen.getByTestId('accept-plan')).toBeTruthy();
    expect(screen.queryByTestId('upgrade-to-save')).toBeNull();
  });

  it('replaces Save with the upgrade prompt for a free user who has spent it, review still visible', () => {
    setUser('spent');
    render(<BuildReviewScreen />);
    expect(screen.queryByTestId('accept-plan')).toBeNull();
    expect(screen.getByTestId('allowance-used')).toBeTruthy();
    expect(screen.getByText('Strategy basics')).toBeTruthy();
    fireEvent.press(screen.getByTestId('upgrade-to-save'));
    expect(mockPush).toHaveBeenCalledWith(PAYWALL_ROUTE);
  });

  it('leaves Save open when the user fetch fails (the server gates anyway)', () => {
    mockUser = { data: undefined, isLoading: false };
    render(<BuildReviewScreen />);
    expect(screen.getByTestId('accept-plan')).toBeTruthy();
  });

  it('switches to the upgrade prompt when the server says the allowance is used', async () => {
    mockCreate.mockRejectedValue(apiError(ERROR_CODES.ALBERT_ALLOWANCE_USED));
    render(<BuildReviewScreen />);
    fireEvent.changeText(screen.getByTestId('path-name'), 'AI basics');
    await act(async () => { fireEvent.press(screen.getByTestId('accept-plan')); });
    await waitFor(() => expect(screen.getByTestId('upgrade-to-save')).toBeTruthy());
    expect(screen.queryByTestId('accept-plan')).toBeNull();
    expect(screen.queryByTestId('review-error')).toBeNull();
  });

  it('on the trial-over 409, shows the closed state: no Save, no retry (079i3)', async () => {
    mockCreate.mockRejectedValue(apiError(ERROR_CODES.FRESH_PATH_TRIAL_OVER));
    render(<BuildReviewScreen />);
    fireEvent.changeText(screen.getByTestId('path-name'), 'AI basics');
    await act(async () => { fireEvent.press(screen.getByTestId('accept-plan')); });
    await waitFor(() => expect(screen.getByTestId('trial-over')).toBeTruthy());
    expect(screen.getByTestId('trial-over').props.children).toBe(ERROR_MESSAGES[ERROR_CODES.FRESH_PATH_TRIAL_OVER]);
    expect(screen.queryByTestId('accept-plan')).toBeNull();
    expect(screen.queryByTestId('review-error')).toBeNull();
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('shows the closed state straight away when the session says the trial is over (079i3)', () => {
    setUser('premium', 2);
    render(<BuildReviewScreen />);
    expect(screen.getByTestId('trial-over')).toBeTruthy();
    expect(screen.queryByTestId('accept-plan')).toBeNull();
  });

  it('says a path is already on the go for PLAN_LIMIT, and keeps Save', async () => {
    mockCreate.mockRejectedValue(apiError(ERROR_CODES.PLAN_LIMIT));
    render(<BuildReviewScreen />);
    fireEvent.changeText(screen.getByTestId('path-name'), 'AI basics');
    await act(async () => { fireEvent.press(screen.getByTestId('accept-plan')); });
    await waitFor(() => expect(screen.getByTestId('review-error')).toBeTruthy());
    expect(screen.getByTestId('review-error').props.children).toMatch(/already have a path on the go/i);
    expect(screen.queryByTestId('upgrade-to-save')).toBeNull();
    expect(screen.getByTestId('accept-plan')).toBeTruthy();
  });

  it('keeps the server message for any other failure', async () => {
    mockCreate.mockRejectedValue(apiError('SOMETHING_ELSE', 'Boom'));
    render(<BuildReviewScreen />);
    fireEvent.changeText(screen.getByTestId('path-name'), 'AI basics');
    await act(async () => { fireEvent.press(screen.getByTestId('accept-plan')); });
    await waitFor(() => expect(screen.getByTestId('review-error').props.children).toBe('Boom'));
  });
});

/** The follow-up box: the server decides what a follow-up means, and the screen renders its action. */
describe('the follow-up box', () => {
  const topic = mockDraft.result.topics[0];
  const refined = (over: Partial<RefinedPlan>): RefinedPlan => ({
    intent: 'x', intentConfidence: 1, action: 'refine', clauses: [], plan: [], removed: [], ...over,
  });

  beforeEach(() => {
    mockRefine.mockReset();
    mockUpdateResult.mockReset();
    mockClearDraft.mockReset();
    mockReplace.mockReset();
    mockCreate.mockReset().mockResolvedValue({ id: 'plan-1' });
  });

  async function send(words: string) {
    fireEvent.changeText(screen.getByTestId('follow-up'), words);
    await act(async () => { fireEvent.press(screen.getByTestId('follow-up-submit')); });
  }

  it('sends nothing while the box is empty', async () => {
    render(<BuildReviewScreen />);
    await act(async () => { fireEvent.press(screen.getByTestId('follow-up-submit')); });
    expect(mockRefine).not.toHaveBeenCalled();
  });

  it('sends the words with the plan, session and requests', async () => {
    mockRefine.mockResolvedValue(refined({ action: 'reject' }));
    render(<BuildReviewScreen />);
    await send('drop it');
    expect(mockRefine).toHaveBeenCalledWith({
      statement: 'drop it', plan: mockDraft.result.topics, sessionId: 'test-session', chunks: [],
    });
  });

  it('on a removal, updates the plan, says how many went, and undoes it', async () => {
    mockRefine.mockResolvedValue(refined({ plan: [], removed: [{ stableKey: topic.stableKey, clause: 'drop', sim: 1 }] }));
    render(<BuildReviewScreen />);
    await send('take out strategy');
    expect(mockUpdateResult).toHaveBeenCalledWith({ ...mockDraft.result, topics: [] });
    expect(screen.getByTestId('refine-notice').props.children).toBe('Removed 1 topic.');
    expect(screen.getByTestId('follow-up').props.value).toBe('');
    fireEvent.press(screen.getByTestId('refine-undo'));
    expect(mockUpdateResult).toHaveBeenLastCalledWith({ ...mockDraft.result, topics: mockDraft.result.topics });
    expect(screen.getByTestId('refine-notice').props.children).toBe('Put those back.');
    expect(screen.queryByTestId('refine-undo')).toBeNull();
  });

  it('says so when nothing matched, with no undo', async () => {
    mockRefine.mockResolvedValue(refined({ plan: mockDraft.result.topics, removed: [] }));
    render(<BuildReviewScreen />);
    await send('take out cooking');
    expect(screen.getByTestId('refine-notice').props.children).toBe("I couldn't find anything matching that in your path.");
    expect(screen.queryByTestId('refine-undo')).toBeNull();
  });

  it('refuses to empty the plan', async () => {
    mockRefine.mockResolvedValue(refined({ refusedEmpty: true }));
    render(<BuildReviewScreen />);
    await send('take out everything');
    expect(mockUpdateResult).not.toHaveBeenCalled();
    expect(screen.getByTestId('refine-notice').props.children).toBe('That would have removed everything, so nothing changed.');
  });

  it('on a replace, swaps in the rebuilt plan', async () => {
    const rebuilt = { ...mockDraft.result, topics: [] };
    mockRefine.mockResolvedValue(refined({ action: 'replace', rebuilt }));
    render(<BuildReviewScreen />);
    await send('actually, something else');
    expect(mockUpdateResult).toHaveBeenCalledWith(rebuilt);
    expect(screen.getByTestId('refine-notice').props.children).toBe('Rebuilt your path around that instead.');
  });

  it('on an accept, saves the path', async () => {
    mockRefine.mockResolvedValue(refined({ action: 'accept' }));
    render(<BuildReviewScreen />);
    fireEvent.changeText(screen.getByTestId('path-name'), 'AI basics');
    await send('looks good');
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ name: 'AI basics' }));
    expect(mockClearDraft).toHaveBeenCalled();
  });

  it('on a restart, drops the draft and goes back to the builder', async () => {
    mockRefine.mockResolvedValue(refined({ action: 'restart' }));
    render(<BuildReviewScreen />);
    await send('start again');
    expect(mockClearDraft).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith(BUILD_ROUTE);
  });

  it('on a reject, says the path was dropped', async () => {
    mockRefine.mockResolvedValue(refined({ action: 'reject' }));
    render(<BuildReviewScreen />);
    await send('no');
    expect(screen.getByTestId('refine-notice').props.children).toBe("Dropped that path. Tell me what you're after and I'll build another.");
  });

  it('says it is unsure on an unhandled follow-up', async () => {
    mockRefine.mockResolvedValue(refined({ action: 'unhandled' }));
    render(<BuildReviewScreen />);
    await send('hmm');
    expect(screen.getByTestId('refine-notice').props.children).toBe("I'm not sure what to change. Try naming the part you don't want.");
  });

  it('shows the server message when the follow-up fails', async () => {
    mockRefine.mockRejectedValue(Object.assign(new Error('x'), { response: { data: { code: 'X', message: 'Boom' } } }));
    render(<BuildReviewScreen />);
    await send('drop it');
    expect(screen.getByTestId('review-error').props.children).toBe('Boom');
  });
});
