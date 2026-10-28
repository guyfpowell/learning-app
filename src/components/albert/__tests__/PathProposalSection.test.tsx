import React from 'react';
import { fireEvent, render, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react-native';
import * as Sentry from '@sentry/react-native';
import {
  ERROR_CODES,
  PROPOSAL_DECIDE_ERROR,
  PROPOSAL_UPGRADE_COPY,
  SUGGESTION_BADGE_TEXT,
  type PathProposal,
} from '@learning/shared';
import { PathProposalSection } from '../PathProposalSection';
import { proposalService } from '@/services/proposal.service';
import { makeCustomPath } from '@/test-utils/paths';
import { queryWrapper } from '@/test-utils/queryClient';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

jest.mock('@/services/proposal.service', () => ({
  proposalService: { getProposal: jest.fn(), decide: jest.fn() },
}));

const mockService = proposalService as jest.Mocked<typeof proposalService>;

const changeProposal: PathProposal = {
  id: 'prop-1',
  reason: "I've moved pricing earlier.",
  change: {
    diff: {
      added: [{ key: 'a', title: 'Roadmaps', position: 2 }],
      removed: [{ key: 'r', title: 'Okrs' }],
      moved: [{ key: 'm', title: 'Pricing', position: 1 }],
    },
  },
  move: null,
};

const moveProposal: PathProposal = {
  id: 'prop-1',
  reason: "I've moved pricing earlier.",
  change: null,
  move: {
    kind: 'forward',
    to: { key: 't', title: 'Pricing' },
    text: 'Skip ahead to Pricing — this marks these topics as skipped: Discovery, Okrs.',
    skips: [{ key: 's1', title: 'Discovery' }, { key: 's2', title: 'Okrs' }],
  },
};

const revisitProposal: PathProposal = {
  ...moveProposal,
  move: { kind: 'revisit', to: { key: 'v', title: 'Discovery' }, text: 'Go back to Discovery.', skips: [] },
};

const path = makeCustomPath({ id: 'plan-1', hasProposal: true });

function renderSection(p = path) {
  render(<PathProposalSection path={p} />, { wrapper: queryWrapper() });
}

/** What the server holds: `getProposal` answers with it, and a decision moves it on. */
let serverProposal: PathProposal | null;

/** The decision succeeds and leaves `next` on the server. */
function decideThen(next: PathProposal | null) {
  mockService.decide.mockImplementation(async () => {
    serverProposal = next;
    return makeCustomPath({ id: 'plan-1', hasProposal: next !== null });
  });
}

/** The decision fails with `code`, leaving `next` on the server (by default, what was there). */
function rejectWith(code: string, next: PathProposal | null = serverProposal) {
  mockService.decide.mockImplementation(async () => {
    serverProposal = next;
    throw { response: { data: { code } } };
  });
}

describe('PathProposalSection (079g7)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    serverProposal = changeProposal;
    mockService.getProposal.mockImplementation(async () => serverProposal);
  });

  it('renders nothing and fetches nothing when the path has no proposal', () => {
    renderSection(makeCustomPath({ id: 'plan-1', hasProposal: false }));
    expect(screen.queryByText(SUGGESTION_BADGE_TEXT.toUpperCase())).toBeNull();
    expect(mockService.getProposal).not.toHaveBeenCalled();
  });

  it('shows the badge and the change card with the reason and the server diff', async () => {
    renderSection();
    expect(await screen.findByTestId('proposal-card')).toBeTruthy();
    expect(screen.getByText(SUGGESTION_BADGE_TEXT.toUpperCase())).toBeTruthy();
    expect(screen.getByText("I've moved pricing earlier.")).toBeTruthy();
    expect(screen.getByText('Roadmaps (position 2)')).toBeTruthy();
    expect(screen.getByText('Okrs')).toBeTruthy();
    expect(screen.getByText('Pricing (to position 1)')).toBeTruthy();
    expect(screen.queryByTestId('move-card')).toBeNull();
  });

  it.each([
    ['proposal-accept', 'accept'],
    ['proposal-decline', 'decline'],
  ] as const)('%s sends %s on the change, by proposal id', async (testID, decision) => {
    decideThen(null);
    renderSection();
    fireEvent.press(await screen.findByTestId(testID));
    await waitFor(() =>
      expect(mockService.decide).toHaveBeenCalledWith({ proposalId: 'prop-1', stage: 'change', decision }),
    );
  });

  it('shows the move card after an accepted change, with exactly the server\'s skipped topics', async () => {
    decideThen(moveProposal);
    renderSection();
    fireEvent.press(await screen.findByTestId('proposal-accept'));

    expect(await screen.findByTestId('move-card')).toBeTruthy();
    expect(screen.getByText('Move on to Pricing')).toBeTruthy();
    expect(screen.getByText(moveProposal.move?.text ?? '')).toBeTruthy();
    expect(screen.getAllByTestId('move-skip').map(n => n.props.children)).toEqual(['Discovery', 'Okrs']);
    expect(screen.queryByTestId('proposal-card')).toBeNull();
  });

  it('reads a move back as a revisit, with no skip list', async () => {
    serverProposal = revisitProposal;
    renderSection();
    expect(await screen.findByText('Revisit Discovery')).toBeTruthy();
    expect(screen.queryByTestId('move-skip')).toBeNull();
  });

  it('decides the move on its own route', async () => {
    serverProposal = moveProposal;
    decideThen(null);
    renderSection();
    fireEvent.press(await screen.findByTestId('proposal-decline'));
    await waitFor(() =>
      expect(mockService.decide).toHaveBeenCalledWith({ proposalId: 'prop-1', stage: 'move', decision: 'decline' }),
    );
  });

  it('shows no move card after a declined change', async () => {
    decideThen(null);
    renderSection();
    fireEvent.press(await screen.findByTestId('proposal-decline'));
    await waitForElementToBeRemoved(() => screen.getByTestId('proposal-card'));
    expect(screen.queryByTestId('move-card')).toBeNull();
    expect(screen.queryByText(SUGGESTION_BADGE_TEXT.toUpperCase())).toBeNull();
  });

  it('refetches silently when the proposal moved on (409)', async () => {
    rejectWith(ERROR_CODES.PROPOSAL_UNAVAILABLE, null);
    renderSection();
    fireEvent.press(await screen.findByTestId('proposal-accept'));
    await waitFor(() => expect(mockService.getProposal).toHaveBeenCalledTimes(2));
    expect(screen.queryByText(PROPOSAL_DECIDE_ERROR)).toBeNull();
  });

  it('offers the paywall on a lapsed subscription (403)', async () => {
    rejectWith(ERROR_CODES.SUBSCRIPTION_INACTIVE);
    renderSection();
    fireEvent.press(await screen.findByTestId('proposal-accept'));
    expect(await screen.findByText(PROPOSAL_UPGRADE_COPY)).toBeTruthy();
    fireEvent.press(screen.getByTestId('proposal-upgrade'));
    expect(mockPush).toHaveBeenCalledWith('/paywall');
  });

  it('shows the fixed error copy on any other failure, and logs it', async () => {
    rejectWith('SOMETHING_ELSE');
    renderSection();
    fireEvent.press(await screen.findByTestId('proposal-accept'));
    expect(await screen.findByText(PROPOSAL_DECIDE_ERROR)).toBeTruthy();
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({ message: 'Proposal decision failed' }));
  });

  it('shows the load error under the badge when the fetch fails, and logs it', async () => {
    mockService.getProposal.mockRejectedValue(new Error('boom'));
    renderSection();
    expect(await screen.findByTestId('proposal-load-error')).toBeTruthy();
    expect(screen.queryByTestId('proposal-card')).toBeNull();
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({ message: 'Proposal load failed' }));
  });
});
