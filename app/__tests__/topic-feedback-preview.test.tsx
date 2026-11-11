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
    expect(screen.getByText(/Knew most of it/i)).toBeTruthy();
  });

  it('closes the preview when Skip is pressed, without any API call', async () => {
    render(<TopicFeedbackPreviewScreen />);
    fireEvent.press(screen.getByText(/skip/i));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
  });
});
