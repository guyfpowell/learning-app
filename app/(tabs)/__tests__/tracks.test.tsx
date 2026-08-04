import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import TracksScreen from '../tracks';
import { useSkills, useEnrollments, useEnroll, useSetActiveTrack } from '@/hooks/useTrack';
import type { SkillWithAccess, TrackEnrollmentWithProgress } from '@learning/shared';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

jest.mock('@/hooks/useTrack', () => ({
  useSkills:         jest.fn(),
  useEnrollments:    jest.fn(),
  useEnroll:         jest.fn(),
  useSetActiveTrack: jest.fn(),
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
    { id: 'sp-1', skillId: 'skill-1', level: 'beginner',     levelLabel: null, durationHours: 4, isPremium: false, createdAt: new Date(), updatedAt: new Date() },
    { id: 'sp-2', skillId: 'skill-1', level: 'intermediate', levelLabel: null, durationHours: 6, isPremium: false, createdAt: new Date(), updatedAt: new Date() },
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
    { id: 'sp-3', skillId: 'skill-2', level: 'beginner', levelLabel: null, durationHours: 8, isPremium: true, createdAt: new Date(), updatedAt: new Date() },
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
  upgradeRequired:  false,
  isActive:         false,
  canSkipTopic:     false,
  canSkipLevel:     false,
};

const activeEnrollment: TrackEnrollmentWithProgress = {
  ...mockEnrollment,
  isActive: true,
};

const mockMutate = jest.fn();
const mockSetActive = jest.fn();

function setMocks({
  skills = [baseSkill],
  enrollments = [] as TrackEnrollmentWithProgress[],
  skillsLoading = false,
  enrollmentsLoading = false,
  skillsError = false,
  skillsErr = null as unknown,
  enrollmentsError = false,
  enrollmentsErr = null as unknown,
  enroll = {
    mutate: mockMutate,
    isPending: false,
    variables: undefined as string | undefined,
    isError: false,
    error: null as unknown,
  },
  setActiveTrack = {
    mutate: mockSetActive,
    isPending: false,
    variables: undefined as string | undefined,
    isError: false,
    error: null as unknown,
  },
} = {}) {
  (useSkills         as jest.Mock).mockReturnValue({ data: skills,      isLoading: skillsLoading, isError: skillsError, error: skillsErr });
  (useEnrollments    as jest.Mock).mockReturnValue({ data: enrollments, isLoading: enrollmentsLoading, isError: enrollmentsError, error: enrollmentsErr });
  (useEnroll         as jest.Mock).mockReturnValue(enroll);
  (useSetActiveTrack as jest.Mock).mockReturnValue(setActiveTrack);
}

describe('TracksScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
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
    expect(mockMutate).toHaveBeenCalledWith('skill-1', expect.objectContaining({ onSuccess: expect.any(Function) }));
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

  describe('navigation', () => {
    it('successful enrol navigates to Home', () => {
      (useEnroll as jest.Mock).mockReturnValue({
        mutate: jest.fn().mockImplementation((_id: string, opts?: { onSuccess?: () => void }) => opts?.onSuccess?.()),
        isPending: false,
        variables: undefined,
        isError: false,
        error: null,
      });
      render(<TracksScreen />);
      fireEvent.press(screen.getByTestId('enrol-btn-skill-1'));
      expect(mockPush).toHaveBeenCalledWith('/(tabs)/lessons');
    });

    it('pressing Upgrade now in PremiumModal navigates to settings', () => {
      setMocks({ skills: [premiumSkill] });
      render(<TracksScreen />);
      fireEvent.press(screen.getByTestId('upgrade-btn-skill-2'));
      fireEvent.press(screen.getByTestId('upgrade-now-btn'));
      expect(mockPush).toHaveBeenCalledWith('/(tabs)/settings');
    });
  });

  describe('error banners', () => {
    it('shows load error banner when skills query fails', () => {
      setMocks({ skillsError: true, skillsErr: { response: { data: { message: 'Skills unavailable' } } } });
      render(<TracksScreen />);
      expect(screen.getByTestId('tracks-load-error')).toBeTruthy();
      expect(screen.getByText('Skills unavailable')).toBeTruthy();
    });

    it('shows load error banner when enrollments query fails', () => {
      setMocks({ enrollmentsError: true, enrollmentsErr: { response: { data: { message: 'Enrollments unavailable' } } } });
      render(<TracksScreen />);
      expect(screen.getByTestId('tracks-load-error')).toBeTruthy();
      expect(screen.getByText('Enrollments unavailable')).toBeTruthy();
    });

    it('shows enrol error banner when enrol mutation fails', () => {
      setMocks({
        enroll: {
          mutate: mockMutate,
          isPending: false,
          variables: undefined,
          isError: true,
          error: { response: { data: { message: 'Enrol failed' } } },
        },
      });
      render(<TracksScreen />);
      expect(screen.getByTestId('tracks-enrol-error')).toBeTruthy();
      expect(screen.getByText('Enrol failed')).toBeTruthy();
    });

    it('shows set-active error banner when setActiveTrack fails', () => {
      setMocks({
        enrollments: [mockEnrollment],
        setActiveTrack: {
          mutate: mockSetActive,
          isPending: false,
          variables: undefined,
          isError: true,
          error: { response: { data: { message: 'Not enrolled in that track' } } },
        },
      });
      render(<TracksScreen />);
      expect(screen.getByTestId('tracks-set-active-error')).toBeTruthy();
      expect(screen.getByText('Not enrolled in that track')).toBeTruthy();
    });
  });

  describe('active track affordance (ticket 044)', () => {
    it('shows ACTIVE badge for enrolled active track', () => {
      setMocks({ skills: [baseSkill], enrollments: [activeEnrollment] });
      render(<TracksScreen />);
      expect(screen.getByTestId('active-badge-skill-1')).toBeTruthy();
      expect(screen.getByText('ACTIVE')).toBeTruthy();
    });

    it('shows "Active track" label for enrolled active track', () => {
      setMocks({ skills: [baseSkill], enrollments: [activeEnrollment] });
      render(<TracksScreen />);
      expect(screen.getByTestId('active-text-skill-1')).toBeTruthy();
      expect(screen.getByText('Active track')).toBeTruthy();
    });

    it('does not show "Make active" button for the active track', () => {
      setMocks({ skills: [baseSkill], enrollments: [activeEnrollment] });
      render(<TracksScreen />);
      expect(screen.queryByTestId('make-active-btn-skill-1')).toBeNull();
    });

    it('shows "Make active" button for enrolled non-active track', () => {
      setMocks({ skills: [baseSkill], enrollments: [mockEnrollment] });
      render(<TracksScreen />);
      expect(screen.getByTestId('make-active-btn-skill-1')).toBeTruthy();
      expect(screen.getByText('MAKE ACTIVE')).toBeTruthy();
    });

    it('pressing "Make active" calls setActiveTrack mutate with skill id', () => {
      setMocks({ skills: [baseSkill], enrollments: [mockEnrollment] });
      render(<TracksScreen />);
      fireEvent.press(screen.getByTestId('make-active-btn-skill-1'));
      expect(mockSetActive).toHaveBeenCalledWith('skill-1');
    });

    it('does not show "Active track" label for non-active enrolled track', () => {
      setMocks({ skills: [baseSkill], enrollments: [mockEnrollment] });
      render(<TracksScreen />);
      expect(screen.queryByTestId('active-text-skill-1')).toBeNull();
    });

    it('does not show ACTIVE badge for non-active enrolled track', () => {
      setMocks({ skills: [baseSkill], enrollments: [mockEnrollment] });
      render(<TracksScreen />);
      expect(screen.queryByTestId('active-badge-skill-1')).toBeNull();
    });
  });

  describe('Build my own path card (049)', () => {
    // Premium here is DERIVED — access to a skill that is actually premium.
    // `userHasAccess` alone is true for free users on free tracks, which would
    // hand everyone the builder.
    it('offers Start when the user has access to a premium track', () => {
      setMocks({ skills: [baseSkill, { ...premiumSkill, userHasAccess: true }] });
      const { getByTestId, queryByTestId } = render(<TracksScreen />);
      expect(getByTestId('build-path-start')).toBeTruthy();
      expect(queryByTestId('build-path-upgrade')).toBeNull();
    });

    it('offers an upgrade to a free user rather than hiding the card', () => {
      setMocks({ skills: [baseSkill, premiumSkill] });
      const { getByTestId, queryByTestId } = render(<TracksScreen />);
      expect(getByTestId('build-path-upgrade')).toBeTruthy();
      expect(queryByTestId('build-path-start')).toBeNull();
      // Still discoverable — the point of showing it at all.
      expect(getByTestId('build-path-card')).toBeTruthy();
    });

    it('never routes a free user into the builder', () => {
      setMocks({ skills: [baseSkill, premiumSkill] });
      const { getByTestId } = render(<TracksScreen />);
      fireEvent.press(getByTestId('build-path-upgrade'));
      expect(mockPush).not.toHaveBeenCalledWith('/build');
      expect(getByTestId('premium-modal')).toBeTruthy();
    });

    it('routes a premium user to the builder', () => {
      setMocks({ skills: [baseSkill, { ...premiumSkill, userHasAccess: true }] });
      const { getByTestId } = render(<TracksScreen />);
      fireEvent.press(getByTestId('build-path-start'));
      expect(mockPush).toHaveBeenCalledWith('/build');
    });
  });
});
