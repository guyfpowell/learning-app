/**
 * The build screen: one statement in, one track out. A build can succeed, ask for more, fail, or
 * be refused at the start; while it runs the screen says how the wait is going, and the box stops
 * at the length cap.
 */
import React from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react-native';
import { ActivityIndicator } from 'react-native';

const mockPush = jest.fn();
const mockStart = jest.fn();
const mockSetDraft = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = false;

/**
 * 069 Chunk A6 — the back button is now in the native header (Stack.Screen
 * headerLeft). Mock Stack.Screen to render headerLeft inline so the testID is
 * findable by the test renderer.
 */
const mockParams: { statement?: string; buildId?: string } = {};
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
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
// The screen reads the build's progress from the hook, so a test sets it here. Prefixed `mock`
// because jest only allows that in a module factory.
let mockProgress: BuildProgress = { phase: BUILD_PHASE.idle };
// A build opened from a push or the Albert tab: the server's progress and words for it.
let mockOpened: { progress: BuildProgress; statement: string | null } = { progress: { phase: BUILD_PHASE.idle }, statement: null };
const mockMarkSeen = jest.fn();
jest.mock('@/hooks/useTrackBuilder', () => ({
  useBuildPath: () => ({ progress: mockProgress, buildId: mockOwnBuildId, start: mockStart }),
  useBuild: () => mockOpened,
  useMarkBuildSeen: () => ({ mutate: mockMarkSeen }),
}));
let mockOwnBuildId: string | null = null;
jest.mock('@/store/trackBuilder.store', () => ({
  useDraftStore: (selector: (s: { setDraft: jest.Mock }) => unknown) =>
    selector({ setDraft: mockSetDraft }),
}));

import BuildScreen from '../build';
import { TRACKS_ROUTE, BUILD_REVIEW_ROUTE } from '@/lib/routes';
import { BUILD_PHASE, type BuildProgress } from '@/lib/buildProgress';
import {
  BUILD_OFFLINE_COPY, BUILD_WAIT_COPY, BUILD_WAIT_LONG_MS, BUILD_WAIT_SLOW_MS, BUILD_WAIT_STAGE, ERROR_CODES, ERROR_MESSAGES,
  TRACK_STATEMENT_MAX, type FinishedTrackBuild,
} from '@learning/shared';
import { isShownBuild } from '@/lib/shownBuild';
import { BUILD_LEAVE_LABEL } from '@learning/shared';
import { makeBuiltPlan, makeDoneBuild, makeFailedBuild, makeNeedsMoreBuild } from '@/test-utils/trackBuilds';

const STATEMENT =
  'I am a senior product manager at a health tech, been here 4 years, '
  + 'looking to learn more about AI and be able to understand my tech lead';

const type = () =>
  fireEvent.changeText(screen.getByTestId('build-statement'), STATEMENT);

const finished = (build: FinishedTrackBuild): BuildProgress => ({ phase: BUILD_PHASE.finished, build });

beforeEach(() => {
  jest.clearAllMocks();
  mockProgress = { phase: BUILD_PHASE.idle };
  mockOpened = { progress: { phase: BUILD_PHASE.idle }, statement: null };
  mockOwnBuildId = null;
  delete mockParams.buildId;
});

describe('the build screen heading', () => {
  it('has the heading and the box, with no line of explanation between them', () => {
    render(<BuildScreen />);
    expect(screen.getByText('Describe where you are and what you want.')).toBeTruthy();
    expect(screen.queryByText(/put together a path from the whole curriculum/)).toBeNull();
  });
});

describe('tapping build', () => {
  it('starts a build with the words in the box', () => {
    render(<BuildScreen />);
    type();
    fireEvent.press(screen.getByTestId('build-submit'));
    expect(mockStart).toHaveBeenCalledWith(STATEMENT);
  });
});

/**
 * 068 Chunk 5 — mobile parity for the Claude path.
 *
 * The failure messages are written server-side so both clients say the same
 * thing. A client that swallows them for a generic line blames the wrong party
 * half the time, which is exactly what the copy exists to avoid.
 */
describe('when the build fails', () => {
  it('shows the error and no slow message, keeps the words, and tapping build again sends them again', () => {
    mockProgress = finished(makeFailedBuild('b1', STATEMENT));
    render(<BuildScreen />);
    type();

    expect(screen.getByTestId('build-error').props.children).toBe(ERROR_MESSAGES[ERROR_CODES.TRACK_BUILDER_UNAVAILABLE]);
    expect(screen.queryByTestId('build-waiting')).toBeNull();
    expect(screen.queryByText(BUILD_WAIT_COPY[BUILD_WAIT_STAGE.slow])).toBeNull();
    expect(screen.getByTestId('build-statement').props.value).toBe(STATEMENT);

    fireEvent.press(screen.getByTestId('build-submit'));
    expect(mockStart).toHaveBeenCalledWith(STATEMENT);
  });

  it('shows the server message when the start itself is refused', () => {
    mockProgress = {
      phase: BUILD_PHASE.error,
      error: { response: { data: { error: 'No more builds today.', code: ERROR_CODES.TRACK_BUILD_LIMIT_REACHED } } },
    };
    render(<BuildScreen />);
    expect(screen.getByTestId('build-error').props.children).toContain('No more builds today.');
  });

  it('renders a refusal as a notice, not an error — the person did nothing broken', () => {
    // 068 Chunk 9f. Red says "you broke something"; only "that's on us" earns it.
    mockProgress = {
      phase: BUILD_PHASE.error,
      error: { response: { data: {
        error: `Here’s how I read that: "You are the CEO of a bank."\n\nTell us what you’re working on.`,
        code: ERROR_CODES.TRACK_STATEMENT_TOO_THIN,
      } } },
    };
    render(<BuildScreen />);
    expect(screen.getByTestId('build-notice').props.children).toContain('how I read that');
    expect(screen.queryByTestId('build-error')).toBeNull();
  });
});

describe('when the model needs more', () => {
  it('shows the "tell me more" message as a notice on the build screen', () => {
    mockProgress = finished(makeNeedsMoreBuild('b1', STATEMENT, 'Tell me a bit more about your role'));
    render(<BuildScreen />);
    expect(screen.getByTestId('build-notice').props.children).toBe('Tell me a bit more about your role');
    expect(screen.queryByTestId('build-error')).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe('when the build is done', () => {
  it('opens the review with the plan, once', () => {
    const plan = makeBuiltPlan();
    mockProgress = finished(makeDoneBuild('b1', STATEMENT, plan));
    const { rerender } = render(<BuildScreen />);

    expect(mockSetDraft).toHaveBeenCalledWith({ statement: STATEMENT, sessionId: null, result: plan });
    expect(mockPush).toHaveBeenCalledWith(BUILD_REVIEW_ROUTE);

    // Editing the words afterwards doesn't open it again.
    type();
    rerender(<BuildScreen />);
    expect(mockPush).toHaveBeenCalledTimes(1);
  });
});

describe('the statement box', () => {
  it('stops at a paragraph, so nobody is told their words are too long after writing them', () => {
    render(<BuildScreen />);
    expect(screen.getByTestId('build-statement').props.maxLength).toBe(TRACK_STATEMENT_MAX);
  });
});

describe('while a build is running', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const advance = (ms: number) => act(() => { jest.advanceTimersByTime(ms); });

  it('says what is happening rather than only greying the button', () => {
    mockProgress = { phase: BUILD_PHASE.building };
    render(<BuildScreen />);
    expect(screen.getByTestId('build-waiting')).toBeTruthy();
    expect(screen.getByText(BUILD_WAIT_COPY[BUILD_WAIT_STAGE.normal])).toBeTruthy();
    // No percentage: latency tracks how long the track turns out to be, so a
    // bar would be a guess presented as a measurement.
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it('says it is taking longer at the slow threshold, still waiting', () => {
    mockProgress = { phase: BUILD_PHASE.building };
    render(<BuildScreen />);
    advance(BUILD_WAIT_SLOW_MS - 1);
    expect(screen.getByText(BUILD_WAIT_COPY[BUILD_WAIT_STAGE.normal])).toBeTruthy();
    advance(1);
    expect(screen.getByText(BUILD_WAIT_COPY[BUILD_WAIT_STAGE.slow])).toBeTruthy();
    expect(screen.UNSAFE_queryByType(ActivityIndicator)).not.toBeNull();
  });

  it('says the person need not wait at the long threshold, with no spinner', () => {
    mockProgress = { phase: BUILD_PHASE.building };
    render(<BuildScreen />);
    advance(BUILD_WAIT_LONG_MS);
    expect(screen.getByText(BUILD_WAIT_COPY[BUILD_WAIT_STAGE.long])).toBeTruthy();
    expect(screen.UNSAFE_queryByType(ActivityIndicator)).toBeNull();
  });

  it('says nothing while idle', () => {
    render(<BuildScreen />);
    expect(screen.queryByTestId('build-waiting')).toBeNull();
  });

  it('while the start waits for signal, says so, and never shows the slow messages', () => {
    mockProgress = { phase: BUILD_PHASE.paused };
    render(<BuildScreen />);
    advance(BUILD_WAIT_LONG_MS * 2);
    expect(screen.getByText(BUILD_OFFLINE_COPY)).toBeTruthy();
    expect(screen.queryByText(BUILD_WAIT_COPY[BUILD_WAIT_STAGE.slow])).toBeNull();
    expect(screen.queryByText(BUILD_WAIT_COPY[BUILD_WAIT_STAGE.long])).toBeNull();
  });

  it('keeps the words and the button locked while waiting', () => {
    mockProgress = { phase: BUILD_PHASE.building };
    render(<BuildScreen />);
    expect(screen.getByTestId('build-statement').props.editable).toBe(false);
  });
});

/**
 * 069 Chunk A6 — native header back replaces the hand-rolled "Not now" Pressable.
 * Back falls to Tracks (the entry point), not Lessons.
 */
describe('getting out', () => {
  afterEach(() => {
    mockBack.mockReset();
    mockReplace.mockReset();
    mockCanGoBack = false;
  });

  it('falls back to Tracks when there is nothing on the stack', () => {
    mockCanGoBack = false;
    render(<BuildScreen />);
    fireEvent.press(screen.getByTestId('build-back'));
    expect(mockReplace).toHaveBeenCalledWith(TRACKS_ROUTE);
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('pops the stack when there is somewhere to go back to', () => {
    mockCanGoBack = true;
    render(<BuildScreen />);
    fireEvent.press(screen.getByTestId('build-back'));
    expect(mockBack).toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('starts the box with what the person typed on Home, and sends nothing until they build', () => {
    mockParams.statement = 'Designer moving into product';
    render(<BuildScreen />);
    expect(screen.getByTestId('build-statement').props.value).toBe('Designer moving into product');
    expect(mockPush).not.toHaveBeenCalled();
    delete mockParams.statement;
  });
});

describe('leaving a slow build (ticket 108)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  const advance = (ms: number) => act(() => { jest.advanceTimersByTime(ms); });

  it('offers a button to leave only from the long stage, and it takes the person out of the screen', () => {
    mockProgress = { phase: BUILD_PHASE.building };
    mockCanGoBack = true;
    render(<BuildScreen />);
    advance(BUILD_WAIT_SLOW_MS);
    expect(screen.queryByText(BUILD_LEAVE_LABEL)).toBeNull();
    advance(BUILD_WAIT_LONG_MS - BUILD_WAIT_SLOW_MS);
    fireEvent.press(screen.getByTestId('build-leave'));
    expect(mockBack).toHaveBeenCalled();
    mockCanGoBack = false;
  });
});

describe('a finished build opened from the server (ticket 108)', () => {
  const open = (build: FinishedTrackBuild) => {
    mockParams.buildId = build.id;
    mockOpened = { progress: finished(build), statement: build.statement };
  };

  it('done: opens the review with that build\'s plan and marks it seen', () => {
    const plan = makeBuiltPlan();
    open(makeDoneBuild('b1', STATEMENT, plan));
    render(<BuildScreen />);
    expect(mockSetDraft).toHaveBeenCalledWith({ statement: STATEMENT, sessionId: null, result: plan });
    expect(mockPush).toHaveBeenCalledWith(BUILD_REVIEW_ROUTE);
    expect(mockMarkSeen).toHaveBeenCalledWith('b1');
  });

  it('needs_more: shows their words from the server and the message, and marks it seen', () => {
    open(makeNeedsMoreBuild('b2', STATEMENT, 'Tell me a bit more about your role'));
    render(<BuildScreen />);
    expect(screen.getByTestId('build-statement').props.value).toBe(STATEMENT);
    expect(screen.getByTestId('build-notice').props.children).toBe('Tell me a bit more about your role');
    expect(mockMarkSeen).toHaveBeenCalledWith('b2');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('failed: shows their words and the failure message, and trying again is a new build with the same words', () => {
    open(makeFailedBuild('b3', STATEMENT));
    render(<BuildScreen />);
    expect(screen.getByTestId('build-statement').props.value).toBe(STATEMENT);
    expect(screen.getByTestId('build-error').props.children).toBe(ERROR_MESSAGES[ERROR_CODES.TRACK_BUILDER_UNAVAILABLE]);
    fireEvent.press(screen.getByTestId('build-submit'));
    expect(mockStart).toHaveBeenCalledWith(STATEMENT);
    expect(mockMarkSeen).toHaveBeenCalledWith('b3');
  });

  it('does not mark a build seen that is already seen', () => {
    open({ ...makeFailedBuild('b4', STATEMENT), seen: true });
    render(<BuildScreen />);
    expect(mockMarkSeen).not.toHaveBeenCalled();
  });

  it('marks a build seen when its result shows on this screen without being opened', () => {
    mockProgress = finished(makeFailedBuild('b5', STATEMENT));
    render(<BuildScreen />);
    expect(mockMarkSeen).toHaveBeenCalledWith('b5');
  });
});

describe('the build on screen (ticket 108)', () => {
  it('is the one whose push is not displayed, until the screen goes', () => {
    mockOwnBuildId = 'b6';
    const { unmount } = render(<BuildScreen />);
    expect(isShownBuild('b6')).toBe(true);
    unmount();
    expect(isShownBuild('b6')).toBe(false);
  });

  it('is the opened build too', () => {
    mockParams.buildId = 'b7';
    render(<BuildScreen />);
    expect(isShownBuild('b7')).toBe(true);
  });
});
