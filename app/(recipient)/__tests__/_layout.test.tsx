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
  colors: { teal: '#1B5E72', textMuted: '#888', white: '#fff', border: '#eee' },
  font: { medium: 'Poppins_500Medium' },
  fontSize: { xs: 11 },
}));

describe('recipient layout', () => {
  it('renders without errors', () => {
    const RecipientLayout = require('../_layout').default;
    expect(() => render(<RecipientLayout />)).not.toThrow();
  });
});
