import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  Tabs: Object.assign(
    ({ children }: any) => children ?? null,
    { Screen: () => null }
  ),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('@/theme', () => ({
  colors: { teal: '#4F46E5', textMuted: '#9CA3AF', white: '#FFFFFF', border: '#E2E8F0' },
  font: { medium: 'Poppins_500Medium' },
  fontSize: { xs: 11 },
}));

jest.mock('@/hooks/useNotifications', () => ({
  useNotifications: jest.fn(),
}));

describe('(tabs) layout', () => {
  it('renders without errors', () => {
    const TabsLayout = require('../_layout').default;
    expect(() => render(<TabsLayout />)).not.toThrow();
  });
});
