import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { RETAKE_LESSON_LABEL, RETAKE_START_ERROR, type Lesson } from '@learning/shared';
import { CompletedLessonView } from '../CompletedLessonView';
import { lessonService } from '@/services/lesson.service';
import { must } from '@/test-utils/must';
import { createTestQueryClient, queryWrapper } from '@/test-utils/queryClient';

jest.mock('@/services/lesson.service', () => ({ lessonService: { startRetake: jest.fn() } }));
const mockStartRetake = lessonService.startRetake as jest.Mock;

jest.mock('@/components/ui/KeyTakeawayBlock', () => ({
  KeyTakeawayBlock: ({ takeaway, testID }: { takeaway: string; testID: string }) => {
    const { Text } = require('react-native');
    return <Text testID={testID}>{takeaway}</Text>;
  },
}));

const lesson: Lesson = {
  id: 'l-1', skillPathId: 'sp', lessonNumber: 1, title: 'Launch tiers', summary: 'What a launch tier is.',
  content: 'First paragraph.\n\nSecond paragraph.', keyTakeaway: 'Match effort to the tier.',
  durationMinutes: 5, difficulty: 'beginner', isTeaser: false, quizCompleted: true, retakeOffered: false,
  quizzes: [{ id: 'q1', lessonId: 'l-1', type: 'multiple-choice', question: 'Which tier is rare?', options: ['Tier 1', 'Tier 3'], correctAnswer: 'Tier 1', explanation: 'Tier 1 is rare.' }],
  createdAt: '', updatedAt: '',
};

function setup(over: Partial<Lesson> = {}) {
  render(<CompletedLessonView lesson={{ ...lesson, ...over }} />, { wrapper: queryWrapper(createTestQueryClient()) });
}

const retakeButton = () => screen.queryByTestId('lesson-retake-btn');

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

  it('never offers to submit an answer', () => {
    setup({ retakeOffered: true });
    fireEvent.press(screen.getByTestId('lesson-tab-quiz'));
    expect(screen.queryByText(/submit|try again|test my knowledge/i)).toBeNull();
  });

  describe('retake (135b)', () => {
    beforeEach(() => mockStartRetake.mockReset());

    it('shows the button on the summary when the lesson offers a retake', () => {
      setup({ retakeOffered: true });
      expect(screen.getByText(RETAKE_LESSON_LABEL)).toBeTruthy();
    });

    it('shows no button when the lesson does not offer one', () => {
      setup({ retakeOffered: false });
      expect(retakeButton()).toBeNull();
      expect(screen.queryByText(RETAKE_LESSON_LABEL)).toBeNull();
    });

    it('shows no button on the other tabs', () => {
      setup({ retakeOffered: true });
      fireEvent.press(screen.getByTestId('lesson-tab-lesson'));
      expect(retakeButton()).toBeNull();
      fireEvent.press(screen.getByTestId('lesson-tab-quiz'));
      expect(retakeButton()).toBeNull();
    });

    it('a tap starts the retake of this lesson', async () => {
      mockStartRetake.mockResolvedValue({ pass: 2 });
      setup({ retakeOffered: true });
      fireEvent.press(must(retakeButton(), 'retake button'));
      await waitFor(() => expect(mockStartRetake).toHaveBeenCalledWith('l-1'));
      expect(screen.queryByText(RETAKE_START_ERROR)).toBeNull();
    });

    it('a failed start shows the error under the button, and the button can be tapped again', async () => {
      mockStartRetake.mockRejectedValue(new Error('409'));
      setup({ retakeOffered: true });
      fireEvent.press(must(retakeButton(), 'retake button'));
      expect(await screen.findByText(RETAKE_START_ERROR)).toBeTruthy();
      mockStartRetake.mockResolvedValue({ pass: 2 });
      fireEvent.press(must(retakeButton(), 'retake button'));
      await waitFor(() => expect(mockStartRetake).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(screen.queryByText(RETAKE_START_ERROR)).toBeNull());
    });
  });

  describe('quiz tab answers (135d)', () => {
    it('hides the answer and the explanation when a retake is offered', () => {
      setup({ retakeOffered: true });
      fireEvent.press(screen.getByTestId('lesson-tab-quiz'));
      expect(screen.getByText('1. Which tier is rare?')).toBeTruthy();
      expect(screen.queryByTestId('quiz-review-correct-q1')).toBeNull();
      expect(screen.queryByText('Tier 1 is rare.')).toBeNull();
    });

    it('marks the answer and shows the explanation when no retake is offered', () => {
      setup({ retakeOffered: false });
      fireEvent.press(screen.getByTestId('lesson-tab-quiz'));
      expect(screen.getByTestId('quiz-review-correct-q1')).toBeTruthy();
      expect(screen.getByText('Tier 1 is rare.')).toBeTruthy();
    });
  });
});
