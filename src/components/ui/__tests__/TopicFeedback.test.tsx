import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import {
  TOPIC_FEEDBACK_ACKNOWLEDGEMENT,
  TOPIC_FEEDBACK_WORDS_MAX,
  type TopicEnd,
} from '@learning/shared';
import { colors } from '@/theme';
import { TopicFeedback } from '../TopicFeedback';

const topicEnd: TopicEnd = { planId: 'plan-1', stableKey: 'topic-a', title: 'Pricing basics' };

function setup(onSubmit = jest.fn().mockResolvedValue(undefined)) {
  const onClose = jest.fn();
  render(<TopicFeedback topicEnd={topicEnd} onSubmit={onSubmit} onClose={onClose} />);
  return { onSubmit, onClose };
}

const press = (testID: string) => fireEvent.press(screen.getByTestId(testID));
const sendDisabled = () => screen.getByTestId('topic-feedback-submit').props.accessibilityState.disabled;

describe('TopicFeedback', () => {
  afterEach(() => jest.useRealTimers());

  it('shows the topic title and "Topic complete"', () => {
    setup();
    expect(screen.getByText('Pricing basics')).toBeTruthy();
    expect(screen.getByText('Topic complete')).toBeTruthy();
  });

  it('shows both questions at once, each as three words', () => {
    setup();
    expect(screen.getByText('How hard was this topic')).toBeTruthy();
    expect(screen.getByText('Too easy')).toBeTruthy();
    expect(screen.getByText('About right')).toBeTruthy();
    expect(screen.getByText('Too hard')).toBeTruthy();
    expect(screen.getByText('How useful was it')).toBeTruthy();
    expect(screen.getByText('Not really')).toBeTruthy();
    expect(screen.getByText('A bit')).toBeTruthy();
    expect(screen.getByText('Very')).toBeTruthy();
  });

  it('shows the note field with its label and placeholder', () => {
    setup();
    expect(screen.getByText('Anything else to tell Albert?')).toBeTruthy();
    expect(screen.getByTestId('topic-feedback-words').props.placeholder).toBe('Something unclear, or what you\u2019d like more of');
  });

  it('limits the title to three lines', () => {
    setup();
    expect(screen.getByTestId('topic-feedback-title').props.numberOfLines).toBe(3);
  });

  it('a word can be picked and unpicked by pressing it again', () => {
    setup();
    press('topic-feedback-level-about_right');
    expect(screen.getByTestId('topic-feedback-level-about_right').props.accessibilityState.selected).toBe(true);
    press('topic-feedback-level-about_right');
    expect(screen.getByTestId('topic-feedback-level-about_right').props.accessibilityState.selected).toBe(false);
  });

  it('Send is the cobalt button, flat grey until answered', () => {
    setup();
    const face = () => StyleSheet.flatten(screen.getByTestId('topic-feedback-submit').props.style).backgroundColor;
    expect(face()).toBe(colors.border);
    press('topic-feedback-level-about_right');
    expect(face()).toBe(colors.brand);
  });

  it('Send is disabled until something is answered', () => {
    setup();
    expect(sendDisabled()).toBe(true);
    press('topic-feedback-level-about_right');
    expect(sendDisabled()).toBe(false);
  });

  it('sends both scales and the words, then shows the acknowledgement', async () => {
    const { onSubmit, onClose } = setup();
    press('topic-feedback-level-lost_me');
    press('topic-feedback-useful-want_more');
    fireEvent.changeText(screen.getByTestId('topic-feedback-words'), 'More examples please');
    press('topic-feedback-submit');

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        stableKey: 'topic-a',
        dismissed: false,
        level: 'lost_me',
        useful: 'want_more',
        words: 'More examples please',
      }),
    );
    expect(await screen.findByText(TOPIC_FEEDBACK_ACKNOWLEDGEMENT)).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('the acknowledgement closes itself', async () => {
    jest.useFakeTimers();
    const { onClose } = setup();
    press('topic-feedback-level-about_right');
    await act(async () => { press('topic-feedback-submit'); });
    expect(screen.getByText(TOPIC_FEEDBACK_ACKNOWLEDGEMENT)).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
    act(() => { jest.runOnlyPendingTimers(); });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('unmounting during the acknowledgement cancels the close', async () => {
    jest.useFakeTimers();
    const onClose = jest.fn();
    const view = render(<TopicFeedback topicEnd={topicEnd} onSubmit={jest.fn().mockResolvedValue(undefined)} onClose={onClose} />);
    press('topic-feedback-level-about_right');
    await act(async () => { press('topic-feedback-submit'); });
    view.unmount();
    act(() => { jest.runOnlyPendingTimers(); });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('sends only what was picked', async () => {
    const { onSubmit } = setup();
    press('topic-feedback-useful-useful');
    press('topic-feedback-submit');
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ stableKey: 'topic-a', dismissed: false, useful: 'useful' }),
    );
  });

  it('Not now sends dismissed and closes with no acknowledgement', async () => {
    const { onSubmit, onClose } = setup();
    expect(screen.getByText('Not now')).toBeTruthy();
    press('topic-feedback-skip');
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({ stableKey: 'topic-a', dismissed: true });
    expect(screen.queryByText(TOPIC_FEEDBACK_ACKNOWLEDGEMENT)).toBeNull();
  });

  it('whitespace-only words do not count as an answer', () => {
    setup();
    fireEvent.changeText(screen.getByTestId('topic-feedback-words'), '   ');
    expect(sendDisabled()).toBe(true);
  });

  it('caps the words at the shared maximum', () => {
    setup();
    expect(screen.getByTestId('topic-feedback-words').props.maxLength).toBe(TOPIC_FEEDBACK_WORDS_MAX);
  });

  it('a failed write shows the error, keeps the picks and does not close', async () => {
    const onSubmit = jest.fn().mockRejectedValue({ response: { data: { message: 'Network down' } } });
    const { onClose } = setup(onSubmit);
    press('topic-feedback-level-knew_most');
    press('topic-feedback-submit');
    expect(await screen.findByText('Network down')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId('topic-feedback-level-knew_most').props.accessibilityState.selected).toBe(true);
    expect(screen.queryByText(TOPIC_FEEDBACK_ACKNOWLEDGEMENT)).toBeNull();
  });

  it('a failed Not now shows the error and keeps the box open', async () => {
    const onSubmit = jest.fn().mockRejectedValue({ response: { data: { message: 'Network down' } } });
    const { onClose } = setup(onSubmit);
    press('topic-feedback-skip');
    expect(await screen.findByText('Network down')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });
});
