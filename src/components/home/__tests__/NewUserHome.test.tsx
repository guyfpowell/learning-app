import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import type { Skill } from '@learning/shared';
import { NewUserHome } from '../NewUserHome';
import { useSkills } from '@/hooks/useTrack';
import { useCurrentUser } from '@/hooks/useEmailVerification';
import { BUILD_ROUTE, TRACKS_ROUTE, trackRoute } from '@/lib/routes';
import { useNewUserHomeStore } from '@/store/newUserHome.store';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/hooks/useTrack', () => ({ useSkills: jest.fn() }));
jest.mock('@/hooks/useEmailVerification', () => ({ useCurrentUser: jest.fn() }));

const skill = (id: string, name: string, order: number) => ({ id, name, order, trackId: order, headline: `${name} headline` }) as Skill;

function setup({ name = 'Sam Jones', skills = [skill('s1', 'Product Strategy', 1), skill('s2', 'AI Fundamentals', 2), skill('s3', 'User Research', 3), skill('s4', 'Product Metrics', 4)] } = {}) {
  (useCurrentUser as jest.Mock).mockReturnValue({ data: name ? { name } : undefined });
  (useSkills as jest.Mock).mockReturnValue({ data: skills });
}

describe('NewUserHome (Albert first)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useNewUserHomeStore.setState({ variant: '1b' });
  });

  it('opens with Albert greeting the person by first name, and no daily framing', () => {
    setup();
    render(<NewUserHome />);
    expect(screen.getByTestId('new-user-welcome')).toHaveTextContent('Welcome to Ascent, Sam');
    expect(screen.getByText("I'm Albert, your guide. Tell me about you.")).toBeTruthy();
    expect(screen.getByText("Tell me where you are. I'll map the way up.")).toBeTruthy();
    expect(screen.queryByText(/a day|daily|every day/i)).toBeNull();
  });

  it('greets without a name while the user has not loaded', () => {
    setup({ name: '' });
    render(<NewUserHome />);
    expect(screen.getByTestId('new-user-welcome')).toHaveTextContent(/^Welcome to Ascent$/);
  });

  it('says the first path is free', () => {
    setup();
    render(<NewUserHome />);
    expect(screen.getByText('Your first path is free.')).toBeTruthy();
  });

  it('takes what the person types to the builder when they build', () => {
    setup();
    render(<NewUserHome />);
    fireEvent.changeText(screen.getByTestId('new-user-statement'), 'I lead a team at a bank');
    fireEvent.press(screen.getByTestId('new-user-build-btn'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: BUILD_ROUTE, params: { statement: 'I lead a team at a bank' } });
  });

  it('opens the builder empty when nothing was typed', () => {
    setup();
    render(<NewUserHome />);
    fireEvent.press(screen.getByTestId('new-user-build-btn'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: BUILD_ROUTE, params: {} });
  });

  it('a starter fills the box, for someone who does not know what to type', () => {
    setup();
    render(<NewUserHome />);
    fireEvent.press(screen.getByTestId('new-user-starter-New PM at a bank'));
    expect(screen.getByTestId('new-user-statement').props.value).toBe('New PM at a bank');
  });

  it('shows what a path might look like', () => {
    setup();
    render(<NewUserHome />);
    expect(screen.getByText('Not a course. Your course.')).toBeTruthy();
    expect(screen.getByText('Making the case to leadership')).toBeTruthy();
  });

  it('offers three ready-made tracks, an AI one first, each opening its track page', () => {
    setup();
    render(<NewUserHome />);
    expect(screen.getByText('Prefer a set route?')).toBeTruthy();
    expect(screen.getByTestId('new-user-track-s2')).toBeTruthy();
    expect(screen.queryByTestId('new-user-track-s4')).toBeNull();
    fireEvent.press(screen.getByTestId('new-user-track-s2'));
    expect(mockPush).toHaveBeenCalledWith(trackRoute('track', 's2'));
  });

  it('links to every track, counting them', () => {
    setup();
    render(<NewUserHome />);
    fireEvent.press(screen.getByText('See all 4 tracks'));
    expect(mockPush).toHaveBeenCalledWith(TRACKS_ROUTE);
  });

  it('names the first badge and the first XP', () => {
    setup();
    render(<NewUserHome />);
    expect(screen.getByText('Your first badge is one lesson away')).toBeTruthy();
    expect(screen.getByText('Finish any lesson to earn First Light and your first XP.')).toBeTruthy();
  });
});
