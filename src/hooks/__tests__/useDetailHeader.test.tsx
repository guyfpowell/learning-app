import React from 'react';
import { fireEvent, render, renderHook } from '@testing-library/react-native';

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace, canGoBack: () => mockCanGoBack }),
}));

import { useDetailHeader } from '../useDetailHeader';

function pressBack() {
  const { result } = renderHook(() => useDetailHeader('Lesson'));
  const headerLeft = result.current.headerLeft as () => React.ReactElement;
  const { getByTestId } = render(headerLeft());
  fireEvent.press(getByTestId('detail-back'));
}

describe('useDetailHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanGoBack = true;
  });

  it('shows the native header with the given title', () => {
    const { result } = renderHook(() => useDetailHeader('Lesson'));
    expect(result.current.headerShown).toBe(true);
    expect(result.current.title).toBe('Lesson');
  });

  it('back pops the stack when there is history', () => {
    pressBack();
    expect(mockBack).toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('back goes to Home when there is nothing to go back to', () => {
    mockCanGoBack = false;
    pressBack();
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/lessons');
    expect(mockBack).not.toHaveBeenCalled();
  });
});
