import React from 'react';
import { render, screen, within } from '@testing-library/react-native';
import { QuizReview } from '../QuizReview';
import type { Quiz } from '@learning/shared';

const choice: Quiz = {
  id: 'q1', lessonId: 'l', type: 'multiple-choice', question: 'What does a PM own?',
  options: ['The outcome', 'The code', 'The budget'], correctAnswer: 'The outcome', explanation: 'A PM owns outcomes, not output.',
};
const short: Quiz = {
  id: 'q2', lessonId: 'l', type: 'short-answer', question: 'Name the tier.', options: [], correctAnswer: 'Tier 1', explanation: '',
};

describe('QuizReview', () => {
  it('shows each question, numbered, with every option and the explanation', () => {
    render(<QuizReview quizzes={[choice, short]} answersHidden={false} />);
    expect(screen.getByText('1. What does a PM own?')).toBeTruthy();
    expect(screen.getByText('2. Name the tier.')).toBeTruthy();
    ['The outcome', 'The code', 'The budget'].forEach((o) => expect(screen.getByText(o)).toBeTruthy());
    expect(screen.getByText('A PM owns outcomes, not output.')).toBeTruthy();
  });

  it('marks only the right option of a multiple-choice question', () => {
    render(<QuizReview quizzes={[choice]} answersHidden={false} />);
    expect(within(screen.getByTestId('quiz-review-correct-q1')).getByText('The outcome')).toBeTruthy();
    expect(screen.getAllByTestId('quiz-review-correct-q1')).toHaveLength(1);
  });

  it('shows the answer of a short-answer question, and leaves out an empty explanation', () => {
    render(<QuizReview quizzes={[short]} answersHidden={false} />);
    expect(within(screen.getByTestId('quiz-review-correct-q2')).getByText('Tier 1')).toBeTruthy();
  });

  it('has nothing to answer or submit', () => {
    render(<QuizReview quizzes={[choice]} answersHidden={false} />);
    expect(screen.queryByText(/submit|check|next/i)).toBeNull();
  });

  it('says so when the lesson has no quiz', () => {
    render(<QuizReview quizzes={[]} answersHidden={false} />);
    expect(screen.getByTestId('quiz-review-empty')).toBeTruthy();
  });

  describe('answers hidden (135d)', () => {
    it('shows each question and every option, with no option marked and no explanation', () => {
      render(<QuizReview quizzes={[choice]} answersHidden />);
      expect(screen.getByText('1. What does a PM own?')).toBeTruthy();
      ['The outcome', 'The code', 'The budget'].forEach((o) => expect(screen.getByText(o)).toBeTruthy());
      expect(screen.queryByTestId('quiz-review-correct-q1')).toBeNull();
      expect(screen.queryByText('WHY')).toBeNull();
      expect(screen.queryByText('A PM owns outcomes, not output.')).toBeNull();
    });

    it('shows no answer for a short-answer question', () => {
      render(<QuizReview quizzes={[short]} answersHidden />);
      expect(screen.getByText('1. Name the tier.')).toBeTruthy();
      expect(screen.queryByTestId('quiz-review-correct-q2')).toBeNull();
      expect(screen.queryByText('Tier 1')).toBeNull();
    });

    it('still says so when the lesson has no quiz', () => {
      render(<QuizReview quizzes={[]} answersHidden />);
      expect(screen.getByTestId('quiz-review-empty')).toBeTruthy();
    });
  });
});
