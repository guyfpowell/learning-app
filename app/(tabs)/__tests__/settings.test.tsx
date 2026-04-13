import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => <>{children}</>,
}));

jest.mock('@/theme', () => ({
  colors: { bg: '#F8FAFC', textDark: '#1E293B', textMuted: '#9CA3AF' },
  font: { bold: 'Poppins_700Bold', regular: 'Poppins_400Regular' },
  fontSize: { xl: 24, base: 15 },
  spacing: { sm: 8, lg: 24 },
}));

describe('SettingsScreen', () => {
  it('renders without errors', () => {
    const SettingsScreen = require('../settings').default;
    expect(() => render(<SettingsScreen />)).not.toThrow();
  });

  it('shows Settings heading', () => {
    const SettingsScreen = require('../settings').default;
    render(<SettingsScreen />);
    expect(screen.getByText('Settings')).toBeTruthy();
  });
});
