import React from 'react';
import { render, screen } from '@testing-library/react-native';
import OldStylePreviewScreen from '../old-style-preview';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('@/providers/QueryProvider', () => ({ queryClient: {} }));
jest.mock('@/components/albert/SituationChangeSection', () => ({ SituationChangeSection: () => null }));

describe('OldStylePreviewScreen', () => {
  it('lists each place that still draws the old button, with where it shows', () => {
    render(<OldStylePreviewScreen />);
    for (const title of ['Test My Knowledge', 'Home with no active path', 'Albert: path complete']) {
      expect(screen.getByText(title)).toBeTruthy();
    }
  });
});
