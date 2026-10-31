import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { LESSON_COMPLETED_BANNER, RETAKE_START_ERROR, type Lesson } from '@learning/shared';
import { CompletedLessonView } from '../CompletedLessonView';

jest.mock('@/components/ui/KeyTakeawayBlock', () => ({
  KeyTakeawayBlock: ({ takeaway, testID }: { takeaway: string; testID: string }) => {
    const { Text } = require('react-native');
    return <Text testID={testID}>{takeaway}</Text>;
  },
}));

const lesson: Lesson = {
  id: 'l-1', skillPathId: 'sp', lessonNumber: 1, title: 'Launch tiers', summary: 'What a launch tier is.',
  content: 'First paragraph.\n\nSecond paragraph.', keyTakeaway: 'Match effort to the tier.',
  durationMinutes: 5, difficulty: 'beginner', isTeaser: false, quizCompleted: true,
  quizzes: [{ id: 'q1', lessonId: 'l-1', type: 'multiple-choice', question: 'Which tier is rare?', options: ['Tier 1', 'Tier 3'], correctAnswer: 'Tier 1', explanation: 'Tier 1 is rare.' }],
  createdAt: '', updatedAt: '',
};

function setup(over: { onRetake?: () => void; retaking?: boolean; retakeFailed?: boolean } = {}) {
  const onRetake = over.onRetake ?? jest.fn();
  render(<CompletedLessonView lesson={lesson} onRetake={onRetake} retaking={over.retaking ?? false} retakeFailed={over.retakeFailed ?? false} />);
  return { onRetake };
}

describe('CompletedLessonView', () => {
  it('opens on the summary, with the completed banner, the summary and the key takeaway', () => {
    setup();
    expect(screen.getByTestId('lesson-completed-banner')).toHaveTextContent(LESSON_COMPLETED_BANNER);
    expect(screen.getByTestId('lesson-summary-text')).toHaveTextContent('What a launch tier is.');
    expect(screen.getByTestId('key-takeaway')).toHaveTextContent('Match effort to the tier.');
    expect(screen.queryByTestId('lesson-content')).toBeNull();
  });

  it('moves between the summary, the full lesson and the quiz, in any order, as often as wanted', () => {
    setup();
    fireEvent.press(screen.getByTestId('lesson-tab-lesson'));
    expect(screen.getAllByTestId('lesson-paragraph')).toHaveLength(2);
    fireEvent.press(screen.getByTestId('lesson-tab-quiz'));
    expect(screen.getByText('1. Which tier is rare?')).toBeTruthy();
    expect(screen.queryByTestId('lesson-content')).toBeNull();
    fireEvent.press(screen.getByTestId('lesson-tab-summary'));
    expect(screen.getByTestId('lesson-summary-text')).toBeTruthy();
    fireEvent.press(screen.getByTestId('lesson-tab-quiz'));
    expect(screen.getByText('Tier 1 is rare.')).toBeTruthy();
  });

  it('never offers to submit an answer: only Retake lesson starts anything', () => {
    setup();
    fireEvent.press(screen.getByTestId('lesson-tab-quiz'));
    expect(screen.queryByTestId('lesson-retake-btn')).toBeNull();
    expect(screen.queryByText(/submit|try again|test my knowledge/i)).toBeNull();
  });

  it('starts a retake only from the summary\'s Retake lesson button', () => {
    const { onRetake } = setup();
    fireEvent.press(screen.getByTestId('lesson-retake-btn'));
    expect(onRetake).toHaveBeenCalledTimes(1);
  });

  it('shows the retake error under the button', () => {
    setup({ retakeFailed: true });
    expect(screen.getByTestId('retake-error')).toHaveTextContent(RETAKE_START_ERROR);
  });
});
