import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import type { Skill, TrackContents } from '@learning/shared';
import { NewUserHome } from '../NewUserHome';
import { useSkills, useTrackContents } from '@/hooks/useTrack';
import { useCurrentUser } from '@/hooks/useEmailVerification';
import { BUILD_ROUTE, lessonRoute } from '@/lib/routes';
import { DEFAULT_NEW_USER_HOME, useNewUserHomeStore } from '@/store/newUserHome.store';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/hooks/useTrack', () => ({ useSkills: jest.fn(), useTrackContents: jest.fn() }));
jest.mock('@/hooks/useEmailVerification', () => ({ useCurrentUser: jest.fn() }));

const skill = (id: string, name: string, order: number) => ({ id, name, order, trackId: order, headline: `${name} headline` }) as Skill;
const contents: TrackContents = {
  kind: 'track',
  id: 's1',
  name: 'Product Strategy',
  enrolled: false,
  groups: [{
    key: 'beginner',
    label: 'beginner',
    completedLessons: 0,
    totalLessons: 1,
    isCurrent: false,
    topics: [{
      key: 't',
      name: 'T',
      completedLessons: 0,
      totalLessons: 1,
      isCurrent: false,
      unresolved: false,
      lessons: [{ id: 'lesson-9', title: 'Strategy versus no strategy', lessonNumber: 1, status: 'not-started', locked: false }],
    }],
  }],
};

beforeEach(() => {
  jest.clearAllMocks();
  useNewUserHomeStore.setState({ variant: DEFAULT_NEW_USER_HOME });
  (useCurrentUser as jest.Mock).mockReturnValue({ data: { name: 'Alex Smith' } });
  (useSkills as jest.Mock).mockReturnValue({ data: [skill('s1', 'Product Strategy', 1), skill('s2', 'AI Fundamentals', 2), skill('s3', 'User Research', 3)] });
  (useTrackContents as jest.Mock).mockReturnValue({ data: contents });
});

describe('NewUserHome picks its layout from the store', () => {
  it('shows the climb (1c) by default', () => {
    render(<NewUserHome />);
    expect(screen.getByTestId('new-user-trail')).toBeTruthy();
  });

  it('shows the pitch for 1a and Albert first for 1b', () => {
    useNewUserHomeStore.setState({ variant: '1a' });
    const { unmount } = render(<NewUserHome />);
    expect(screen.getByTestId('new-user-pitch')).toBeTruthy();
    unmount();
    useNewUserHomeStore.setState({ variant: '1b' });
    render(<NewUserHome />);
    expect(screen.getByTestId('new-user-albert')).toBeTruthy();
  });
});

describe('1a, the pitch', () => {
  beforeEach(() => useNewUserHomeStore.setState({ variant: '1a' }));

  it('makes the promise, names the person, and has one button to build a free path', () => {
    render(<NewUserHome />);
    expect(screen.getByTestId('new-user-welcome')).toHaveTextContent('WELCOME TO ASCENT, ALEX');
    expect(screen.getByText('Get good at product. In the gaps of your day.')).toBeTruthy();
    fireEvent.press(screen.getByTestId('new-user-build-btn'));
    expect(mockPush).toHaveBeenCalledWith(BUILD_ROUTE);
  });

  it('offers tracks, four numbered reasons, and the first badge', () => {
    render(<NewUserHome />);
    expect(screen.getByText('Or start a track now')).toBeTruthy();
    expect(screen.getByText('Why it sticks')).toBeTruthy();
    expect(screen.getByText('01')).toBeTruthy();
    expect(screen.getByText('Ready for AI')).toBeTruthy();
    expect(screen.getByText('Your first badge is one lesson away')).toBeTruthy();
  });
});

describe('1c, the climb', () => {
  beforeEach(() => useNewUserHomeStore.setState({ variant: '1c' }));

  it('draws the four levels as a trail, starting at Beginner', () => {
    render(<NewUserHome />);
    for (const level of ['Beginner', 'Intermediate', 'Advanced', 'Expert']) expect(screen.getByText(level)).toBeTruthy();
    expect(screen.getByText('You start here')).toBeTruthy();
  });

  it('offers a real lesson from the first track, started in one tap', () => {
    render(<NewUserHome />);
    expect(screen.getByText('Strategy versus no strategy')).toBeTruthy();
    expect(screen.getByText('Product Strategy · Beginner · Lesson 1')).toBeTruthy();
    fireEvent.press(screen.getByTestId('new-user-start-lesson'));
    expect(mockPush).toHaveBeenCalledWith(lessonRoute('lesson-9'));
  });

  it('shows no lesson card until the first track has loaded', () => {
    (useTrackContents as jest.Mock).mockReturnValue({ data: undefined });
    render(<NewUserHome />);
    expect(screen.queryByTestId('new-user-starter')).toBeNull();
  });

  it('puts Albert second, and names the first three badges', () => {
    render(<NewUserHome />);
    fireEvent.press(screen.getByTestId('new-user-albert-row'));
    expect(mockPush).toHaveBeenCalledWith(BUILD_ROUTE);
    for (const name of ['First Light', 'Hat-Trick', 'Foothills']) expect(screen.getByText(name)).toBeTruthy();
    expect(screen.getByText('Pick your mountain')).toBeTruthy();
  });
});
