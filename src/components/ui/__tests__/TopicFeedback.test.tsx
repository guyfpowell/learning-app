import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import {
  TOPIC_FEEDBACK_ACKNOWLEDGEMENT,
  TOPIC_FEEDBACK_LEVEL_LABELS,
  TOPIC_FEEDBACK_USEFUL_LABELS,
  TOPIC_FEEDBACK_WORDS_MAX,
  type TopicEnd,
} from '@learning/shared';
import { TopicFeedback } from '../TopicFeedback';

const topicEnd: TopicEnd = { planId: 'plan-1', stableKey: 'topic-a', title: 'Pricing basics' };

function setup(onSubmit = jest.fn().mockResolvedValue(undefined)) {
  const onClose = jest.fn();
  render(<TopicFeedback topicEnd={topicEnd} onSubmit={onSubmit} onClose={onClose} />);
  return { onSubmit, onClose };
}

describe('TopicFeedback', () => {
  it('shows the topic title and both scales with the shared labels', () => {
    setup();
    expect(screen.getByText('Pricing basics')).toBeTruthy();
    expect(screen.getByTestId('topic-feedback-level-knew_most')).toBeTruthy();
    expect(screen.getByText(TOPIC_FEEDBACK_LEVEL_LABELS.lost_me.toUpperCase())).toBeTruthy();
    expect(screen.getByText(TOPIC_FEEDBACK_USEFUL_LABELS.want_more.toUpperCase())).toBeTruthy();
  });

  it('sends both scales and the words, then shows the acknowledgement', async () => {
    const { onSubmit, onClose } = setup();
    fireEvent.press(screen.getByTestId('topic-feedback-level-lost_me'));
    fireEvent.press(screen.getByTestId('topic-feedback-useful-want_more'));
    fireEvent.press(screen.getByTestId('topic-feedback-words-toggle'));
    fireEvent.changeText(screen.getByTestId('topic-feedback-words'), 'More examples please');
    fireEvent.press(screen.getByTestId('topic-feedback-submit'));

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
    fireEvent.press(screen.getByTestId('topic-feedback-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('sends only what was picked', async () => {
    const { onSubmit } = setup();
    fireEvent.press(screen.getByTestId('topic-feedback-useful-useful'));
    fireEvent.press(screen.getByTestId('topic-feedback-submit'));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ stableKey: 'topic-a', dismissed: false, useful: 'useful' }),
    );
  });

  it('tapping the picked option again unpicks it', async () => {
    const { onSubmit } = setup();
    fireEvent.press(screen.getByTestId('topic-feedback-level-about_right'));
    fireEvent.press(screen.getByTestId('topic-feedback-level-about_right'));
    fireEvent.press(screen.getByTestId('topic-feedback-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ stableKey: 'topic-a', dismissed: true }));
  });

  it('with nothing picked the button says Not now, sends dismissed and closes with no acknowledgement', async () => {
    const { onSubmit, onClose } = setup();
    expect(screen.getByText('NOT NOW')).toBeTruthy();
    fireEvent.press(screen.getByTestId('topic-feedback-submit'));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({ stableKey: 'topic-a', dismissed: true });
    expect(screen.queryByText(TOPIC_FEEDBACK_ACKNOWLEDGEMENT)).toBeNull();
  });

  it('whitespace-only words do not count as an answer', async () => {
    const { onSubmit } = setup();
    fireEvent.press(screen.getByTestId('topic-feedback-words-toggle'));
    fireEvent.changeText(screen.getByTestId('topic-feedback-words'), '   ');
    expect(screen.getByText('NOT NOW')).toBeTruthy();
    fireEvent.press(screen.getByTestId('topic-feedback-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ stableKey: 'topic-a', dismissed: true }));
  });

  it('caps the words at the shared maximum', () => {
    setup();
    fireEvent.press(screen.getByTestId('topic-feedback-words-toggle'));
    expect(screen.getByTestId('topic-feedback-words').props.maxLength).toBe(TOPIC_FEEDBACK_WORDS_MAX);
  });

  it('a failed write shows the error, keeps the picks and does not close', async () => {
    const onSubmit = jest.fn().mockRejectedValue({ response: { data: { message: 'Network down' } } });
    const { onClose } = setup(onSubmit);
    fireEvent.press(screen.getByTestId('topic-feedback-level-knew_most'));
    fireEvent.press(screen.getByTestId('topic-feedback-submit'));
    expect(await screen.findByText('Network down')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('SEND')).toBeTruthy();
    expect(screen.queryByText(TOPIC_FEEDBACK_ACKNOWLEDGEMENT)).toBeNull();
  });
});
