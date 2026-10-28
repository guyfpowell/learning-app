import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import {
  TOPIC_FEEDBACK_ACKNOWLEDGEMENT,
  TOPIC_FEEDBACK_LEVEL_LABELS,
  TOPIC_FEEDBACK_USEFUL_LABELS,
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
const openUseful = () => press('topic-feedback-useful-summary');
const openWords = () => press('topic-feedback-words-summary');
const sendDisabled = () => screen.getByTestId('topic-feedback-submit').props.accessibilityState.disabled;

describe('TopicFeedback', () => {
  afterEach(() => jest.useRealTimers());

  it('shows the topic title and the Level tiles with the shared labels', () => {
    setup();
    expect(screen.getByText('Pricing basics')).toBeTruthy();
    expect(screen.getByTestId('topic-feedback-level-knew_most')).toBeTruthy();
    expect(screen.getByText(TOPIC_FEEDBACK_LEVEL_LABELS.lost_me)).toBeTruthy();
  });

  it('shows the End of topic eyebrow', () => {
    setup();
    expect(screen.getByText('End of topic')).toBeTruthy();
  });

  it('limits the title to two lines', () => {
    setup();
    expect(screen.getByTestId('topic-feedback-title').props.numberOfLines).toBe(2);
  });

  describe('steps', () => {
    it('opens Level first, with Useful and Words collapsed', () => {
      setup();
      expect(screen.getByTestId('topic-feedback-level-about_right')).toBeTruthy();
      expect(screen.queryByTestId('topic-feedback-useful-useful')).toBeNull();
      expect(screen.queryByTestId('topic-feedback-words')).toBeNull();
      expect(screen.getByTestId('topic-feedback-useful-summary')).toBeTruthy();
      expect(screen.getByTestId('topic-feedback-words-summary')).toBeTruthy();
    });

    it('picking a Level answer collapses it to its label and opens Useful', () => {
      setup();
      press('topic-feedback-level-about_right');
      expect(screen.queryByTestId('topic-feedback-level-about_right')).toBeNull();
      expect(screen.getByTestId('topic-feedback-level-summary-value').props.children).toBe(TOPIC_FEEDBACK_LEVEL_LABELS.about_right);
      expect(screen.getByTestId('topic-feedback-useful-useful')).toBeTruthy();
    });

    it('picking a Useful answer collapses it and opens Words', () => {
      setup();
      openUseful();
      press('topic-feedback-useful-want_more');
      expect(screen.queryByTestId('topic-feedback-useful-want_more')).toBeNull();
      expect(screen.getByTestId('topic-feedback-useful-summary-value').props.children).toBe(TOPIC_FEEDBACK_USEFUL_LABELS.want_more);
      expect(screen.getByTestId('topic-feedback-words')).toBeTruthy();
    });

    it('unpicking an answer leaves the open step alone', () => {
      setup();
      press('topic-feedback-level-about_right');
      press('topic-feedback-level-summary');
      press('topic-feedback-level-about_right');
      expect(screen.getByTestId('topic-feedback-level-about_right').props.accessibilityState.selected).toBe(false);
      expect(screen.queryByTestId('topic-feedback-useful-useful')).toBeNull();
      expect(sendDisabled()).toBe(true);
    });

    it('a collapsed row reopens its step and closes the one that was open', () => {
      setup();
      press('topic-feedback-level-lost_me');
      expect(screen.getByTestId('topic-feedback-useful-useful')).toBeTruthy();
      press('topic-feedback-level-summary');
      expect(screen.getByTestId('topic-feedback-level-lost_me').props.accessibilityState.selected).toBe(true);
      expect(screen.queryByTestId('topic-feedback-useful-useful')).toBeNull();
    });

    it('the Words text survives collapsing and shows in the summary', () => {
      setup();
      openWords();
      fireEvent.changeText(screen.getByTestId('topic-feedback-words'), 'More examples please');
      press('topic-feedback-level-summary');
      expect(screen.queryByTestId('topic-feedback-words')).toBeNull();
      expect(screen.getByTestId('topic-feedback-words-summary-value').props.children).toBe('More examples please');
      openWords();
      expect(screen.getByTestId('topic-feedback-words').props.value).toBe('More examples please');
    });

    it('opening Words does not focus the field', () => {
      setup();
      openWords();
      const border = StyleSheet.flatten(screen.getByTestId('topic-feedback-words').props.style).borderColor;
      expect(border).toBe(colors.border);
    });

    it('Send stays visible through every step change', () => {
      setup();
      expect(screen.getByTestId('topic-feedback-submit')).toBeTruthy();
      press('topic-feedback-level-about_right');
      expect(screen.getByTestId('topic-feedback-submit')).toBeTruthy();
      openWords();
      expect(screen.getByTestId('topic-feedback-submit')).toBeTruthy();
    });
  });

  it('Send is the coral button, dimmed until answered', () => {
    setup();
    const send = () => StyleSheet.flatten(screen.getByTestId('topic-feedback-submit').props.style);
    expect(send()).toEqual(expect.objectContaining({ backgroundColor: colors.coral, opacity: 0.5 }));
    press('topic-feedback-level-about_right');
    expect(send().backgroundColor).toBe(colors.coral);
    expect(send().opacity).toBeUndefined();
  });

  it('the words field takes a brand border on focus', () => {
    setup();
    openWords();
    const border = () => StyleSheet.flatten(screen.getByTestId('topic-feedback-words').props.style).borderColor;
    expect(border()).toBe(colors.border);
    fireEvent(screen.getByTestId('topic-feedback-words'), 'focus');
    expect(border()).toBe(colors.brand);
    fireEvent(screen.getByTestId('topic-feedback-words'), 'blur');
    expect(border()).toBe(colors.border);
  });

  it('has no words toggle and no Not now', () => {
    setup();
    expect(screen.queryByTestId('topic-feedback-words-toggle')).toBeNull();
    expect(screen.queryByText(/not now/i)).toBeNull();
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
    expect(screen.queryByTestId('topic-feedback-close')).toBeNull();
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
    openUseful();
    press('topic-feedback-useful-useful');
    press('topic-feedback-submit');
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ stableKey: 'topic-a', dismissed: false, useful: 'useful' }),
    );
  });

  it('Skip sends dismissed and closes with no acknowledgement', async () => {
    const { onSubmit, onClose } = setup();
    press('topic-feedback-skip');
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({ stableKey: 'topic-a', dismissed: true });
    expect(screen.queryByText(TOPIC_FEEDBACK_ACKNOWLEDGEMENT)).toBeNull();
  });

  it('whitespace-only words do not count as an answer', () => {
    setup();
    openWords();
    fireEvent.changeText(screen.getByTestId('topic-feedback-words'), '   ');
    expect(sendDisabled()).toBe(true);
  });

  it('caps the words at the shared maximum', () => {
    setup();
    openWords();
    expect(screen.getByTestId('topic-feedback-words').props.maxLength).toBe(TOPIC_FEEDBACK_WORDS_MAX);
  });

  it('a failed write shows the error, keeps the picks and does not close', async () => {
    const onSubmit = jest.fn().mockRejectedValue({ response: { data: { message: 'Network down' } } });
    const { onClose } = setup(onSubmit);
    press('topic-feedback-level-knew_most');
    press('topic-feedback-submit');
    expect(await screen.findByText('Network down')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId('topic-feedback-level-summary-value').props.children).toBe(TOPIC_FEEDBACK_LEVEL_LABELS.knew_most);
    expect(screen.queryByText(TOPIC_FEEDBACK_ACKNOWLEDGEMENT)).toBeNull();
  });

  it('a failed Skip shows the error and keeps the box open', async () => {
    const onSubmit = jest.fn().mockRejectedValue({ response: { data: { message: 'Network down' } } });
    const { onClose } = setup(onSubmit);
    press('topic-feedback-skip');
    expect(await screen.findByText('Network down')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });
});
