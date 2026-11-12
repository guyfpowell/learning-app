import React from 'react';
import { render, screen, within } from '@testing-library/react-native';
import AlbertSuggestionPreviewScreen from '../albert-suggestion-preview';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('AlbertSuggestionPreviewScreen', () => {
  it('shows the tab icon and the bar with and without a suggestion waiting', () => {
    render(<AlbertSuggestionPreviewScreen />);
    expect(screen.getByText('Nothing to review')).toBeTruthy();
    expect(screen.getByText('Suggestion waiting')).toBeTruthy();
    expect(screen.getAllByTestId('albert-tab-dot')).toHaveLength(3);
    expect(screen.getByTestId('albert-bar-3-attention')).toBeTruthy();
    // The dot is also on the menu bar, whichever tab the person is on.
    expect(within(screen.getByTestId('mock-tab-bar-home-waiting')).getByTestId('albert-tab-dot')).toBeTruthy();
    expect(within(screen.getByTestId('mock-tab-bar-albert-waiting')).getByTestId('albert-tab-dot')).toBeTruthy();
    expect(within(screen.getByTestId('mock-tab-bar-home-clear')).queryByTestId('albert-tab-dot')).toBeNull();
  });
});
