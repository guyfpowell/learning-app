import React from 'react';
import { ScrollView } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { AuthFrame } from '../AuthFrame';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function frame(scrollToEnd: boolean) {
  return <AuthFrame title="Create account" intro="Join" footerLead="Have one?" footerAction="Sign in" onFooter={jest.fn()} scrollToEnd={scrollToEnd}><></></AuthFrame>;
}

describe('AuthFrame', () => {
  it('shows the title, the intro and the switch line', () => {
    render(frame(false));
    expect(screen.getByText('Create account')).toBeTruthy();
    expect(screen.getByText('Join')).toBeTruthy();
    expect(screen.getByText('Sign in')).toBeTruthy();
  });

  it('scrolls to the foot when the form grows, only while asked to', () => {
    const toEnd = jest.spyOn(ScrollView.prototype, 'scrollToEnd').mockImplementation(() => undefined);
    const { rerender } = render(frame(false));
    const scroll = () => screen.UNSAFE_getByType(ScrollView);
    fireEvent(scroll(), 'contentSizeChange', 300, 900);
    expect(toEnd).not.toHaveBeenCalled();
    rerender(frame(true));
    fireEvent(scroll(), 'contentSizeChange', 300, 1100);
    expect(toEnd).toHaveBeenCalledTimes(1);
    toEnd.mockRestore();
  });
});
