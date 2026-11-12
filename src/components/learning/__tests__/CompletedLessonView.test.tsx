import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { type Lesson } from '@learning/shared';
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

function setup() {
  render(<CompletedLessonView lesson={lesson} />);
}

describe('CompletedLessonView', () => {
  it('opens on the summary, with the summary and the key takeaway', () => {
    setup();
    expect(screen.getByText('KEY TAKEAWAY')).toBeTruthy();
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

  it('never offers to submit an answer, or to retake the lesson', () => {
    setup();
    expect(screen.queryByTestId('lesson-retake-btn')).toBeNull();
    expect(screen.queryByText(/retake/i)).toBeNull();
    fireEvent.press(screen.getByTestId('lesson-tab-quiz'));
    expect(screen.queryByText(/submit|try again|test my knowledge|retake/i)).toBeNull();
  });
});
