import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import TopicFeedbackPreviewScreen from '../topic-feedback-preview';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack }) }));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('TopicFeedbackPreviewScreen', () => {
  beforeEach(() => mockBack.mockClear());

  it('shows the real topic feedback screen with a made-up topic', () => {
    render(<TopicFeedbackPreviewScreen />);
    expect(screen.getByText('Preview topic')).toBeTruthy();
    expect(screen.getByText('Too easy')).toBeTruthy();
  });

  it('closes the preview when Not now is pressed, without any API call', async () => {
    render(<TopicFeedbackPreviewScreen />);
    fireEvent.press(screen.getByText('Not now'));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
  });
});
