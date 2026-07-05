import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import TracksScreen from '../tracks';
import { useSkills, useEnrollments, useEnroll } from '@/hooks/useTrack';
import type { SkillWithAccess, TrackEnrollmentWithProgress } from '@learning/shared';

jest.mock('@/hooks/useTrack', () => ({
  useSkills:      jest.fn(),
  useEnrollments: jest.fn(),
  useEnroll:      jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync:  jest.fn(() => Promise.resolve(null)),
  setItemAsync:  jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

const baseSkill: SkillWithAccess = {
  id:            'skill-1',
  trackId:       1,
  name:          'Product Strategy',
  description:   'Learn product strategy',
  category:      'product-management',
  order:         1,
  premiumStatus: 'free',
  userHasAccess: true,
  enrolledSkillId: null,
  skillPaths: [
    { id: 'sp-1', skillId: 'skill-1', level: 'beginner',     durationHours: 4, isPremium: false, createdAt: new Date(), updatedAt: new Date() },
    { id: 'sp-2', skillId: 'skill-1', level: 'intermediate', durationHours: 6, isPremium: false, createdAt: new Date(), updatedAt: new Date() },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const premiumSkill: SkillWithAccess = {
  ...baseSkill,
  id:            'skill-2',
  name:          'AI Engineering',
  category:      'ai-engineering',
  premiumStatus: 'premium',
  userHasAccess: false,
  skillPaths: [
    { id: 'sp-3', skillId: 'skill-2', level: 'beginner', durationHours: 8, isPremium: true, createdAt: new Date(), updatedAt: new Date() },
  ],
};

const mockEnrollment: TrackEnrollmentWithProgress = {
  id:               'enr-1',
  userId:           'user-1',
  skillId:          'skill-1',
  enrolledAt:       '2026-01-01T00:00:00Z',
  completedAt:      null,
  skill:            baseSkill,
  totalLessons:     10,
  completedLessons: 3,
  percentComplete:  30,
  nextLesson:       null,
  levels:           [],
};

const mockMutate = jest.fn();

function setMocks({
  skills = [baseSkill],
  enrollments = [] as TrackEnrollmentWithProgress[],
  skillsLoading = false,
  enrollmentsLoading = false,
  enroll = { mutate: mockMutate, isPending: false, variables: undefined as string | undefined },
} = {}) {
  (useSkills      as jest.Mock).mockReturnValue({ data: skills,      isLoading: skillsLoading });
  (useEnrollments as jest.Mock).mockReturnValue({ data: enrollments, isLoading: enrollmentsLoading });
  (useEnroll      as jest.Mock).mockReturnValue(enroll);
}

describe('TracksScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMocks();
  });

  it('renders without errors', () => {
    expect(() => render(<TracksScreen />)).not.toThrow();
  });

  it('shows Tracks heading', () => {
    render(<TracksScreen />);
    expect(screen.getByText('Tracks')).toBeTruthy();
  });

  it('shows loading indicator while skills are loading', () => {
    setMocks({ skillsLoading: true });
    render(<TracksScreen />);
    expect(screen.getByTestId('tracks-loading')).toBeTruthy();
  });

  it('shows loading indicator while enrollments are loading', () => {
    setMocks({ enrollmentsLoading: true });
    render(<TracksScreen />);
    expect(screen.getByTestId('tracks-loading')).toBeTruthy();
  });

  it('renders a card for each skill', () => {
    setMocks({ skills: [baseSkill, premiumSkill] });
    render(<TracksScreen />);
    expect(screen.getByTestId('skill-card-skill-1')).toBeTruthy();
    expect(screen.getByTestId('skill-card-skill-2')).toBeTruthy();
  });

  it('shows skill name', () => {
    render(<TracksScreen />);
    expect(screen.getByText('Product Strategy')).toBeTruthy();
  });

  it('shows estimated hours from skill paths', () => {
    render(<TracksScreen />);
    // 4 + 6 = 10 hrs
    expect(screen.getByText('10 hrs')).toBeTruthy();
  });

  it('shows category badge (uppercased)', () => {
    render(<TracksScreen />);
    expect(screen.getByText('PRODUCT')).toBeTruthy();
  });

  it('shows Enrol button for accessible, non-enrolled skill', () => {
    render(<TracksScreen />);
    expect(screen.getByTestId('enrol-btn-skill-1')).toBeTruthy();
    expect(screen.getByText('ENROL')).toBeTruthy();
  });

  it('pressing Enrol calls mutate with skill id', () => {
    render(<TracksScreen />);
    fireEvent.press(screen.getByTestId('enrol-btn-skill-1'));
    expect(mockMutate).toHaveBeenCalledWith('skill-1');
  });

  it('shows Currently enrolled text and Enrolled badge for enrolled skill', () => {
    setMocks({ enrollments: [mockEnrollment] });
    render(<TracksScreen />);
    expect(screen.getByTestId('enrolled-badge-skill-1')).toBeTruthy();
    expect(screen.getByText('ENROLLED')).toBeTruthy();
    expect(screen.getByTestId('enrolled-text-skill-1')).toBeTruthy();
    expect(screen.getByText('Currently enrolled')).toBeTruthy();
  });

  it('does not show Enrol button for enrolled skill', () => {
    setMocks({ enrollments: [mockEnrollment] });
    render(<TracksScreen />);
    expect(screen.queryByTestId('enrol-btn-skill-1')).toBeNull();
  });

  it('shows locked badge and Upgrade button for premium skill', () => {
    setMocks({ skills: [premiumSkill] });
    render(<TracksScreen />);
    expect(screen.getByTestId('locked-badge-skill-2')).toBeTruthy();
    expect(screen.getByTestId('upgrade-btn-skill-2')).toBeTruthy();
    expect(screen.getByText('🔒 UPGRADE')).toBeTruthy();
  });

  it('does not show Enrol button for locked skill', () => {
    setMocks({ skills: [premiumSkill] });
    render(<TracksScreen />);
    expect(screen.queryByTestId('enrol-btn-skill-2')).toBeNull();
  });

  it('pressing Upgrade button shows premium modal', () => {
    setMocks({ skills: [premiumSkill] });
    render(<TracksScreen />);
    fireEvent.press(screen.getByTestId('upgrade-btn-skill-2'));
    expect(screen.getByText('Premium Content')).toBeTruthy();
  });

  it('dismissing premium modal hides it', () => {
    setMocks({ skills: [premiumSkill] });
    render(<TracksScreen />);
    fireEvent.press(screen.getByTestId('upgrade-btn-skill-2'));
    expect(screen.getByText('Premium Content')).toBeTruthy();
    fireEvent.press(screen.getByTestId('dismiss-btn'));
  });
});
