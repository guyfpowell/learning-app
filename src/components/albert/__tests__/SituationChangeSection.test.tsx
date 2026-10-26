import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import {
  ERROR_CODES,
  PROPOSAL_UPGRADE_COPY,
  SITUATION_CHANGE_INVITE,
  SITUATION_FAILED_COPY,
  SITUATION_LOAD_ERROR,
  PATH_END_PROMPT,
  SITUATION_NO_CHANGE_COPY,
  SITUATION_NO_CHANGE_PATH_END_COPY,
  SITUATION_POLL_MS,
  SITUATION_SEND_ERROR,
  TRACK_STATEMENT_MAX,
  type SituationChange,
  type SituationChangeOutcome,
} from '@learning/shared';
import { SituationChangeSection } from '../SituationChangeSection';
import { situationChangeService } from '@/services/situationChange.service';
import { PATHS_QUERY_KEY, proposalQueryKey } from '@/lib/queryKeys';
import { createTestQueryClient, queryWrapper } from '@/test-utils/queryClient';

jest.mock('@/services/situationChange.service', () => ({
  situationChangeService: { create: jest.fn(), getLatest: jest.fn() },
}));

const mockService = situationChangeService as jest.Mocked<typeof situationChangeService>;

function change(outcome: SituationChangeOutcome): SituationChange {
  return { id: 'sc-1', planId: 'plan-1', text: 'I got promoted', createdAt: '2026-10-26T10:00:00.000Z', outcome };
}

const onUpgrade = jest.fn();

/** What the server holds as the latest change; `getLatest` answers with it. */
let serverLatest: SituationChange | null;

function renderSection({ locked = false, pathFinished = false, client = createTestQueryClient() } = {}) {
  render(<SituationChangeSection planId="plan-1" locked={locked} pathFinished={pathFinished} onUpgrade={onUpgrade} />, { wrapper: queryWrapper(client) });
  return client;
}

/** Types the words and presses Tell Albert, inside `act` so the send settles. */
async function tellAlbert(words: string) {
  fireEvent.changeText(screen.getByTestId('situation-change-text'), words);
  await act(async () => { fireEvent.press(screen.getByTestId('situation-change-submit')); });
}

/** Lets one poll interval pass and the read it triggers settle. */
async function poll() {
  await act(async () => { jest.advanceTimersByTime(SITUATION_POLL_MS); });
}

describe('SituationChangeSection (079h)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    serverLatest = null;
    mockService.getLatest.mockImplementation(async () => serverLatest);
  });
  afterEach(() => jest.useRealTimers());

  it('shows the invitation and caps the box at the shared statement limit', async () => {
    renderSection();
    expect(await screen.findByText(SITUATION_CHANGE_INVITE)).toBeTruthy();
    expect(screen.getByTestId('situation-change-text').props.maxLength).toBe(TRACK_STATEMENT_MAX);
  });

  it('shows a free user the entry locked: the invitation and an upgrade, no box and no request', () => {
    renderSection({ locked: true });
    expect(screen.getByText(SITUATION_CHANGE_INVITE)).toBeTruthy();
    expect(screen.queryByTestId('situation-change-text')).toBeNull();
    fireEvent.press(screen.getByTestId('situation-change-upgrade'));
    expect(onUpgrade).toHaveBeenCalledTimes(1);
    expect(mockService.getLatest).not.toHaveBeenCalled();
  });

  it('at path end asks what they want to learn next, in place of the mid-path invitation (079i3)', async () => {
    renderSection({ pathFinished: true });
    expect(await screen.findByText(PATH_END_PROMPT)).toBeTruthy();
    expect(screen.queryByText(SITUATION_CHANGE_INVITE)).toBeNull();
    expect(screen.getByTestId('situation-change-text').props.maxLength).toBe(TRACK_STATEMENT_MAX);
  });

  it('shows a free user at path end the prompt and an upgrade, no box (079i3)', () => {
    renderSection({ locked: true, pathFinished: true });
    expect(screen.getByText(PATH_END_PROMPT)).toBeTruthy();
    expect(screen.queryByTestId('situation-change-text')).toBeNull();
    fireEvent.press(screen.getByTestId('situation-change-upgrade'));
    expect(onUpgrade).toHaveBeenCalledTimes(1);
  });

  it('at path end, shows the path-end copy on no_change, not the mid-path silence copy (079i3)', async () => {
    mockService.create.mockResolvedValue(change('running'));
    renderSection({ pathFinished: true });
    await screen.findByTestId('situation-change-text');
    await tellAlbert('I want to learn pricing');
    serverLatest = change('no_change');
    await poll();
    expect(await screen.findByText(SITUATION_NO_CHANGE_PATH_END_COPY)).toBeTruthy();
    expect(screen.queryByText(SITUATION_NO_CHANGE_COPY)).toBeNull();
    // Declined or silent, the path stays finished and the box stays, so they can write again.
    expect(screen.getByTestId('situation-change-text')).toBeTruthy();
  });

  it('keeps Tell Albert off until there are words', async () => {
    renderSection();
    await screen.findByTestId('situation-change-text');
    expect(screen.getByTestId('situation-change-submit').props.accessibilityState.disabled).toBe(true);
    fireEvent.changeText(screen.getByTestId('situation-change-text'), '   ');
    expect(screen.getByTestId('situation-change-submit').props.accessibilityState.disabled).toBe(true);
  });

  it('sends the trimmed words and shows the looking state while the outcome is running', async () => {
    mockService.create.mockResolvedValue(change('running'));
    renderSection();
    await screen.findByTestId('situation-change-text');
    await tellAlbert('  I got promoted  ');

    expect(mockService.create).toHaveBeenCalledWith('plan-1', 'I got promoted');
    expect(screen.getByTestId('situation-change-looking')).toBeTruthy();
    expect(screen.queryByTestId('situation-change-text')).toBeNull();
  });

  it('keeps polling while running, then shows the silence copy on no_change', async () => {
    mockService.create.mockResolvedValue(change('running'));
    renderSection();
    await screen.findByTestId('situation-change-text');
    await tellAlbert('I got promoted');

    serverLatest = change('running');
    await poll();
    expect(screen.getByTestId('situation-change-looking')).toBeTruthy();
    expect(screen.queryByText(SITUATION_NO_CHANGE_COPY)).toBeNull();

    serverLatest = change('no_change');
    await poll();
    expect(await screen.findByText(SITUATION_NO_CHANGE_COPY)).toBeTruthy();
    expect(screen.queryByTestId('situation-change-looking')).toBeNull();
    expect(screen.getByTestId('situation-change-text').props.value).toBe('');
  });

  it('does not show the silence copy when the look failed', async () => {
    mockService.create.mockResolvedValue(change('failed'));
    renderSection();
    await screen.findByTestId('situation-change-text');
    await tellAlbert('I got promoted');

    expect(await screen.findByText(SITUATION_FAILED_COPY)).toBeTruthy();
    expect(screen.queryByText(SITUATION_NO_CHANGE_COPY)).toBeNull();
  });

  it('on a proposal, re-reads the paths and that path\'s suggestion so the card appears or is replaced', async () => {
    mockService.create.mockResolvedValue(change('running'));
    const client = createTestQueryClient();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    renderSection({ client });
    await screen.findByTestId('situation-change-text');
    await tellAlbert('I got promoted');
    serverLatest = change('proposal');
    await poll();

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: PATHS_QUERY_KEY }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: proposalQueryKey('plan-1') });
    expect(screen.queryByText(SITUATION_NO_CHANGE_COPY)).toBeNull();
    expect(screen.queryByText(SITUATION_FAILED_COPY)).toBeNull();
    expect(screen.queryByTestId('situation-change-looking')).toBeNull();
  });

  it('resumes the looking state on mount when a look is still running', async () => {
    serverLatest = change('running');
    renderSection();
    expect(await screen.findByTestId('situation-change-looking')).toBeTruthy();
  });

  it('does not replay an old finished outcome on mount', async () => {
    serverLatest = change('no_change');
    renderSection();
    await screen.findByTestId('situation-change-text');
    expect(screen.queryByText(SITUATION_NO_CHANGE_COPY)).toBeNull();
    expect(screen.queryByText(SITUATION_FAILED_COPY)).toBeNull();
  });

  it('shows the send error, keeps the words, and logs nothing of them', async () => {
    mockService.create.mockRejectedValue(new Error('boom'));
    renderSection();
    await screen.findByTestId('situation-change-text');
    await tellAlbert('I got promoted');

    expect(await screen.findByText(SITUATION_SEND_ERROR)).toBeTruthy();
    expect(screen.getByTestId('situation-change-text').props.value).toBe('I got promoted');
  });

  it('shows the upgrade copy and an upgrade when the server says the subscription is inactive', async () => {
    mockService.create.mockRejectedValue({ response: { data: { code: ERROR_CODES.SUBSCRIPTION_INACTIVE } } });
    renderSection();
    await screen.findByTestId('situation-change-text');
    await tellAlbert('I got promoted');

    expect(await screen.findByText(PROPOSAL_UPGRADE_COPY)).toBeTruthy();
    fireEvent.press(screen.getByTestId('situation-change-upgrade'));
    expect(onUpgrade).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(SITUATION_SEND_ERROR)).toBeNull();
  });

  it('shows the load error when the latest change cannot be read', async () => {
    mockService.getLatest.mockRejectedValue(new Error('boom'));
    renderSection();
    expect(await screen.findByText(SITUATION_LOAD_ERROR)).toBeTruthy();
  });

  it('stops looking and shows the load error when a read fails while Albert is looking', async () => {
    serverLatest = change('running');
    renderSection();
    expect(await screen.findByTestId('situation-change-looking')).toBeTruthy();

    mockService.getLatest.mockRejectedValue(new Error('boom'));
    await poll();

    expect(await screen.findByText(SITUATION_LOAD_ERROR)).toBeTruthy();
    expect(screen.queryByTestId('situation-change-looking')).toBeNull();
  });
});
