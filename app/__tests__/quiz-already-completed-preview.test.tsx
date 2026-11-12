import React from 'react';
import { render, screen } from '@testing-library/react-native';
import QuizAlreadyCompletedPreviewScreen from '../quiz-already-completed-preview';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack, push: jest.fn(), replace: jest.fn() }) }));
jest.mock('@/components/QuizModal', () => ({
  QuizModal: ({ lesson, visible }: { lesson: { quizCompleted?: boolean }; visible: boolean }) => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text testID="quiz-modal">{`${visible}-${lesson.quizCompleted}`}</Text>;
  },
}));

describe('QuizAlreadyCompletedPreviewScreen', () => {
  it('opens the quiz, visible, on a lesson that is already completed', () => {
    render(<QuizAlreadyCompletedPreviewScreen />);
    expect(screen.getByTestId('quiz-modal')).toHaveTextContent('true-true');
  });
});
