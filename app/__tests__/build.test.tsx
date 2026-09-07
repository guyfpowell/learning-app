/**
 * The question loop on the build screen — 049b Chunk 1b, mobile parity.
 *
 * The rule that matters: **nothing is built while any request is open.** The
 * founding statement of 049b —
 *
 *   "I am a senior product manager at a health tech, been here 4 years,
 *    looking to learn more about AI and be able to understand my tech lead"
 *
 * — is two requests, and one confident area was previously treated as
 * permission to build sixteen lessons from them. Both questions have to be put,
 * each answer has to reach the request it was about, and the review screen must
 * not be reached until every request has closed.
 *
 * Kept in step with the web test of the same name deliberately: the two clients
 * have diverged before, and a rule that only one of them obeys is not a rule.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import type { RequestChunk } from '@/services/trackBuilder.service';

const mockPush = jest.fn();
const mockBuild = jest.fn();
const mockAnswer = jest.fn();
const mockSetDraft = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/hooks/useTrackBuilder', () => ({
  useBuildPlan: () => ({ mutateAsync: mockBuild, isPending: false }),
  useAnswerChunk: () => ({ mutateAsync: mockAnswer, isPending: false }),
}));
jest.mock('@/store/trackBuilder.store', () => ({
  useDraftStore: (selector: any) => selector({ setDraft: mockSetDraft }),
}));

import BuildScreen from '../build';

const STATEMENT =
  'I am a senior product manager at a health tech, been here 4 years, '
  + 'looking to learn more about AI and be able to understand my tech lead';

const chunk = (over: Partial<RequestChunk> & { id: string }): RequestChunk => ({
  text: '', verdict: 'ready', question: null, answers: [], statedLevel: null,
  scope: [], measured: { matchedWords: 0, matchedTopics: 0, topTrack: null, trackCoverage: 0 },
  ...over,
});

/** What the server returns for the founding statement: two open requests. */
const OPEN: RequestChunk[] = [
  chunk({
    id: 'c1', text: 'looking to learn more about AI', verdict: 'too-broad',
    question: '"looking to learn more about AI" covers the whole of AI for Product '
      + 'Managers. Which parts of it do you want, and how deep should we go?',
  }),
  chunk({
    id: 'c2', text: 'be able to understand my tech lead', verdict: 'too-vague',
    question: 'What do you mean by "be able to understand my tech lead"? '
      + "Give me an example of something you'd want to be able to do.",
  }),
];

const ASKED = {
  shouldAsk: true, isFoundation: false, chunks: OPEN,
  questions: OPEN.map((c) => c.question!),
  sessionId: 's1', name: '', level: 'Senior', levelConfidence: 0.9,
  intent: 'none', intentConfidence: 0.9, firedAreas: [], topics: [],
};

const BUILT = {
  ...ASKED, shouldAsk: false, questions: [],
  topics: [{
    stableKey: '9:beginner:0', order: 0, topicName: 'Your AI toolkit',
    level: 'beginner', area: null, hops: 0,
  }],
};

beforeEach(() => jest.clearAllMocks());

const type = () =>
  fireEvent.changeText(screen.getByTestId('build-statement'), STATEMENT);

describe('a statement with two requests gets two questions', () => {
  it('asks about both, and builds nothing', async () => {
    mockBuild.mockResolvedValue(ASKED);
    render(<BuildScreen />);
    type();
    fireEvent.press(screen.getByTestId('build-submit'));

    await waitFor(() => expect(screen.getByTestId('build-question-c1')).toBeTruthy());
    expect(screen.getByTestId('build-question-c2')).toBeTruthy();
    // No plan, so no review screen — however confident the areas were.
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('sends an answer to the request it was about, and nothing else', async () => {
    mockBuild.mockResolvedValue(ASKED);
    mockAnswer.mockResolvedValue({
      chunks: [{ ...OPEN[0], verdict: 'ready', question: null, answers: ['prompting'] }, OPEN[1]],
      questions: [OPEN[1].question!], shouldAsk: true, plan: null, sessionId: 's1',
    });
    render(<BuildScreen />);
    type();
    fireEvent.press(screen.getByTestId('build-submit'));
    await waitFor(() => expect(screen.getByTestId('build-answer-c1')).toBeTruthy());

    fireEvent.changeText(screen.getByTestId('build-answer-c1'), 'prompting');
    fireEvent.press(screen.getByTestId('build-answer-submit-c1'));

    await waitFor(() => expect(mockAnswer).toHaveBeenCalledWith({
      chunks: OPEN, chunkId: 'c1', answer: 'prompting', sessionId: 's1',
    }));
    // c1 has closed; c2 is untouched and still asking.
    await waitFor(() => expect(screen.queryByTestId('build-question-c1')).toBeNull());
    expect(screen.getByTestId('build-question-c2')).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('goes to the review screen only once every request has closed', async () => {
    mockBuild.mockResolvedValue(ASKED);
    mockAnswer.mockResolvedValue({
      chunks: OPEN.map((c) => ({ ...c, verdict: 'ready', question: null })),
      questions: [], shouldAsk: false, plan: BUILT, sessionId: 's1',
    });
    render(<BuildScreen />);
    type();
    fireEvent.press(screen.getByTestId('build-submit'));
    await waitFor(() => expect(screen.getByTestId('build-answer-c1')).toBeTruthy());

    fireEvent.changeText(screen.getByTestId('build-answer-c1'), 'prompting');
    fireEvent.press(screen.getByTestId('build-answer-submit-c1'));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/build-review'));
    expect(mockSetDraft).toHaveBeenCalledWith(
      expect.objectContaining({ result: BUILT, sessionId: 's1' }),
    );
  });
});

describe('a request we understood and do not teach — Rule 5', () => {
  it('says what it is and asks nothing about it', async () => {
    mockBuild.mockResolvedValue({
      ...ASKED,
      chunks: [chunk({
        id: 'c1', text: 'PRINCE2', verdict: 'unservable', question: null,
        reason: '"PRINCE2" is project management — we cover product management, '
          + "so that's outside what we teach.",
      })],
      questions: [],
    });
    render(<BuildScreen />);
    type();
    fireEvent.press(screen.getByTestId('build-submit'));

    await waitFor(() => expect(screen.getByTestId('build-refused-c1')).toBeTruthy());
    // No answer box: no answer would help, so asking for one wastes their time.
    expect(screen.queryByTestId('build-answer-c1')).toBeNull();
    // And NOT "I couldn't tell what you want" underneath it — we understood
    // them exactly, and saying both contradicts the line above.
    expect(screen.queryByTestId('build-ask')).toBeNull();
  });
});

describe('when nothing could be placed at all', () => {
  it('falls back to the general question', async () => {
    mockBuild.mockResolvedValue({ ...ASKED, chunks: [], questions: [] });
    render(<BuildScreen />);
    type();
    fireEvent.press(screen.getByTestId('build-submit'));

    await waitFor(() => expect(screen.getByTestId('build-ask')).toBeTruthy());
  });
});
