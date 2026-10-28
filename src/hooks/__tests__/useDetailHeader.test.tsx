import React from 'react';
import { StyleSheet } from 'react-native';
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

  it('the back control is an icon in a centred 44pt target, not a text glyph', () => {
    const { result } = renderHook(() => useDetailHeader('Lesson'));
    const headerLeft = result.current.headerLeft as () => React.ReactElement;
    const { getByTestId, queryByText } = render(headerLeft());
    const style = StyleSheet.flatten(getByTestId('detail-back').props.style);
    expect(style).toEqual(expect.objectContaining({ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }));
    expect(queryByText('‹')).toBeNull();
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
