import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from '@/components/ui/Text';
import { QuizResultFrame } from '@/components/quiz/QuizResultFrame';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const frame = { onClose: jest.fn(), saved: false, onToggleSave: jest.fn() };

describe('QuizResultFrame', () => {
  it('has no colour wash when it has no tone', () => {
    const { queryByTestId } = render(<QuizResultFrame {...frame}><Text>body</Text></QuizResultFrame>);
    expect(queryByTestId('quiz-frame-gradient')).toBeNull();
    expect(queryByTestId('quiz-frame-contours', { includeHiddenElements: true })).toBeNull();
  });

  it.each(['correct', 'retry', 'incorrect'] as const)('washes a %s result in its gradient with contours', tone => {
    const { getByTestId, getByText } = render(<QuizResultFrame {...frame} tone={tone}><Text>body</Text></QuizResultFrame>);
    expect(getByTestId('quiz-frame-gradient')).toBeTruthy();
    expect(getByTestId('quiz-frame-contours', { includeHiddenElements: true })).toBeTruthy();
    expect(getByText('body')).toBeTruthy();
  });
});
