/**
 * The build screen — one statement in, one track out.
 *
 * The question-loop cases went on 2026-09-08 (068 Chunk 6b) with the loop they
 * tested; they are in `archived/2026-09-08-local-track-classifier/`. What is
 * left is what a build can still do: succeed, or fail in one of two ways, or be
 * stopped at the length cap.
 *
 * Kept in step with the web test of the same name deliberately: the two clients
 * have diverged before, and a rule that only one of them obeys is not a rule.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockBuild = jest.fn();
const mockSetDraft = jest.fn();

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, replace: mockReplace }) }));
// `isPending` is react-query's, so the screen's `busy` cannot be driven by
// resolving or hanging `mutateAsync` — it is read at render. The mock reflects
// a variable the test sets, which is the only honest way to render the waiting
// state without pulling a QueryClient into the test.
// Prefixed `mock` because jest only allows that in a module factory.
let mockPending = false;
jest.mock('@/hooks/useTrackBuilder', () => ({
  useBuildPlan: () => ({ mutateAsync: mockBuild, isPending: mockPending }),
}));
jest.mock('@/store/trackBuilder.store', () => ({
  useDraftStore: (selector: any) => selector({ setDraft: mockSetDraft }),
}));

import BuildScreen from '../build';

const STATEMENT =
  'I am a senior product manager at a health tech, been here 4 years, '
  + 'looking to learn more about AI and be able to understand my tech lead';

const type = () =>
  fireEvent.changeText(screen.getByTestId('build-statement'), STATEMENT);

/**
 * 068 Chunk 5 — mobile parity for the Claude path.
 *
 * The two failure messages are written server-side so both clients say the same
 * thing. A client that swallows them for a generic line blames the wrong party
 * half the time, which is exactly what the copy exists to avoid.
 */
describe('when the build fails', () => {
  it('shows the server message rather than a generic line', async () => {
    mockBuild.mockRejectedValue({
      response: { data: {
        error: "That's on us, not you — the part that reads your statement isn't responding.",
        code: 'TRACK_BUILDER_UNAVAILABLE',
      } },
    });
    render(<BuildScreen />);
    type();
    fireEvent.press(screen.getByTestId('build-submit'));

    await waitFor(() => expect(screen.getByTestId('build-error')).toBeTruthy());
    expect(screen.getByTestId('build-error').props.children)
      .toContain("That's on us, not you");
  });

  it('renders a refusal as a notice, not an error — the person did nothing broken', async () => {
    // 068 Chunk 9f. Red says "you broke something"; only "that's on us" earns it.
    mockBuild.mockRejectedValue({
      response: { data: {
        error: 'Here’s how I read that: “You are the CEO of a bank.”\n\nTell us what you’re working on.',
        code: 'TRACK_STATEMENT_TOO_THIN',
      } },
    });
    render(<BuildScreen />);
    type();
    fireEvent.press(screen.getByTestId('build-submit'));

    await waitFor(() => expect(screen.getByTestId('build-notice')).toBeTruthy());
    expect(screen.getByTestId('build-notice').props.children).toContain('how I read that');
    expect(screen.queryByTestId('build-error')).toBeNull();
  });
});

describe('the statement box', () => {
  it('stops at a paragraph, so nobody is told their words are too long after writing them', () => {
    render(<BuildScreen />);
    // 1,000 characters — the server's cap, and three times the longest
    // statement anyone has actually written.
    expect(screen.getByTestId('build-statement').props.maxLength).toBe(1000);
  });
});

/**
 * 068 Chunk 7a — a build takes 4–9 seconds and used only to grey the button.
 * Kept in step with the web test of the same name.
 */
describe('while a build is running', () => {
  afterEach(() => { mockPending = false; });

  it('says what is happening rather than only greying the button', () => {
    mockPending = true;
    render(<BuildScreen />);
    expect(screen.getByTestId('build-waiting')).toBeTruthy();
    // No percentage: latency tracks how long the track turns out to be, so a
    // bar would be a guess presented as a measurement.
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it('says nothing while idle', () => {
    render(<BuildScreen />);
    expect(screen.queryByTestId('build-waiting')).toBeNull();
  });
});

/**
 * 068 Chunk 9c — `_layout.tsx` sets `headerShown: false` and /build sits outside
 * the tabs, so without this the screen is a trap: no header, no tab bar, no way
 * back.
 */
describe('getting out', () => {
  it('offers a way out, and goes to the tabs rather than popping blind', () => {
    render(<BuildScreen />);
    fireEvent.press(screen.getByTestId('build-back'));
    // `replace`, not `back()`: the screen can be arrived at from more than one
    // place, and a blind pop from a deep link lands nowhere.
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/lessons');
  });
});
