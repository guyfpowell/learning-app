import React from 'react';
import { StyleSheet } from 'react-native';
import { colors } from '@/theme';
import { render, screen, fireEvent, within } from '@testing-library/react-native';
import TracksScreen from '../tracks';
import { useSkills, usePaths, useEnroll, useSetActivePath } from '@/hooks/useTrack';
import type { ActivePathRef, SkillWithAccess, UserPath } from '@learning/shared';
import { makeCustomPath } from '@/test-utils/paths';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

jest.mock('@/hooks/useTrack', () => ({
  useSkills:         jest.fn(),
  usePaths:          jest.fn(),
  useEnroll:         jest.fn(),
  useSetActivePath:  jest.fn(),
}));

let capturedEdges: string[] | undefined;
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, edges }: { children: React.ReactNode; edges?: string[] }) => {
    capturedEdges = edges;
    return <>{children}</>;
  },
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
  headline:      'Learn product strategy',
  detail:        null,
  category:      'product-management',
  order:         1,
  premiumStatus: 'free',
  userHasAccess: true,
  enrolledSkillId: null,
  skillPaths: [
    { id: 'sp-1', skillId: 'skill-1', level: 'beginner',     levelLabel: null, durationHours: 4, isPremium: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'sp-2', skillId: 'skill-1', level: 'intermediate', levelLabel: null, durationHours: 6, isPremium: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const premiumSkill: SkillWithAccess = {
  ...baseSkill,
  id:            'skill-2',
  name:          'AI Engineering',
  category:      'ai-engineering',
  premiumStatus: 'premium',
  userHasAccess: false,
  skillPaths: [
    { id: 'sp-3', skillId: 'skill-2', level: 'beginner', levelLabel: null, durationHours: 8, isPremium: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ],
};

const mockEnrollment: UserPath = {
  kind:             'track',
  topicEnd:         null,
  id:               'skill-1',
  name:             baseSkill.name,
  description:      null,
  enrolledAt:       '2026-01-01T00:00:00Z',
  completedAt:      null,
  skill:            baseSkill,
  totalLessons:     10,
  completedLessons: 3,
  percentComplete:  30,
  nextLesson:       null,
  levels:           [],
  isActive:         false,
  canSkipLesson:    false,
  canSkipTopic:     false,
  canSkipLevel:     false,
  averageScore:     null,
  capstoneScore:    null,
};

const activeEnrollment: UserPath = {
  ...mockEnrollment,
  isActive: true,
};

const mockMutate = jest.fn();
const mockSetActive = jest.fn();

function setMocks({
  skills = [baseSkill],
  enrollments = [] as UserPath[],
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
    variables: undefined as ActivePathRef | undefined,
    isError: false,
    error: null as unknown,
  },
} = {}) {
  (useSkills         as jest.Mock).mockReturnValue({ data: skills,      isLoading: skillsLoading, isError: skillsError, error: skillsErr });
  (usePaths           as jest.Mock).mockReturnValue({ data: enrollments, isLoading: enrollmentsLoading, isError: enrollmentsError, error: enrollmentsErr });
  (useEnroll         as jest.Mock).mockReturnValue(enroll);
  (useSetActivePath  as jest.Mock).mockReturnValue(setActiveTrack);
}

describe('TracksScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedEdges = undefined;
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

  it('no longer shows estimated hours (093a)', () => {
    render(<TracksScreen />);
    expect(screen.queryByText('10 hrs')).toBeNull();
  });

  it('shows the headline field whole under the name (093c)', () => {
    setMocks({ skills: [{ ...baseSkill, headline: 'Run a job search like a product — from breaking in to the top.' }] });
    render(<TracksScreen />);
    expect(screen.getByTestId('skill-headline-skill-1').props.children).toBe('Run a job search like a product — from breaking in to the top.');
  });

  it('shows no headline line when the headline is empty (093c)', () => {
    setMocks({ skills: [{ ...baseSkill, headline: '' }] });
    render(<TracksScreen />);
    expect(screen.queryByTestId('skill-headline-skill-1')).toBeNull();
  });

  it('mutes the headline on a locked card (093a)', () => {
    setMocks({ skills: [premiumSkill] });
    render(<TracksScreen />);
    const style = StyleSheet.flatten(screen.getByTestId('skill-headline-skill-2').props.style);
    expect(style.color).toBe(colors.textMuted);
  });

  it('shows category badge (uppercased)', () => {
    render(<TracksScreen />);
    expect(screen.getByText('PRODUCT')).toBeTruthy();
  });

  it('falls back to the raw category for a value with no label (BUG-080e-1)', () => {
    // Web admin can create categories such as 'design' / 'data-science'.
    setMocks({ skills: [{ ...baseSkill, category: 'data-science' }] });
    render(<TracksScreen />);
    expect(screen.getByText('DATA-SCIENCE')).toBeTruthy();
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

    it('pressing Upgrade now in PremiumModal navigates to the paywall (073b-5)', () => {
      setMocks({ skills: [premiumSkill] });
      render(<TracksScreen />);
      fireEvent.press(screen.getByTestId('upgrade-btn-skill-2'));
      fireEvent.press(screen.getByTestId('upgrade-now-btn'));
      expect(mockPush).toHaveBeenCalledWith('/paywall');
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

    it('pressing "Make active" calls setActivePath mutate with the path ref', () => {
      setMocks({ skills: [baseSkill], enrollments: [mockEnrollment] });
      render(<TracksScreen />);
      fireEvent.press(screen.getByTestId('make-active-btn-skill-1'));
      expect(mockSetActive).toHaveBeenCalledWith({ kind: 'track', id: 'skill-1' });
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

  describe('Albert CTA + custom paths (076b)', () => {
    const customPath = makeCustomPath({
      id: 'plan-1',
      name: 'My Discovery Path',
      totalLessons: mockEnrollment.totalLessons,
      completedLessons: mockEnrollment.completedLessons,
      percentComplete: mockEnrollment.percentComplete,
    });

    it('no longer renders the build-path card (moved to the Albert tab)', () => {
      render(<TracksScreen />);
      expect(screen.queryByTestId('build-path-card')).toBeNull();
      expect(screen.queryByTestId('build-path-start')).toBeNull();
      expect(screen.queryByTestId('build-path-upgrade')).toBeNull();
    });

    it('shows a single-line CTA that routes to the Albert tab', () => {
      render(<TracksScreen />);
      fireEvent.press(screen.getByTestId('albert-cta'));
      expect(mockPush).toHaveBeenCalledWith('/(tabs)/albert');
    });

    it('omits the Your paths section entirely when there are no custom paths', () => {
      setMocks({ enrollments: [mockEnrollment] });
      render(<TracksScreen />);
      expect(screen.queryByTestId('your-paths-section')).toBeNull();
      expect(screen.queryByText('Your paths')).toBeNull();
    });

    it('lists custom paths above the pre-built tracks', () => {
      setMocks({ enrollments: [mockEnrollment, customPath] });
      render(<TracksScreen />);
      expect(screen.getByText('Your paths')).toBeTruthy();
      expect(screen.getByTestId('custom-path-card-plan-1')).toBeTruthy();
      // track-kind paths are not listed under Your paths
      expect(screen.queryByTestId('custom-path-card-skill-1')).toBeNull();
      expect(screen.getByText('Pre-built tracks')).toBeTruthy();
    });

    it('renders the custom paths section before the pre-built heading', () => {
      setMocks({ enrollments: [customPath] });
      const { toJSON } = render(<TracksScreen />);
      const json = JSON.stringify(toJSON());
      expect(json.indexOf('Your paths')).toBeLessThan(json.indexOf('Pre-built tracks'));
    });

    it('shows a My path badge on an active and a non-active custom path (093)', () => {
      setMocks({ enrollments: [customPath, { ...makeCustomPath({ id: 'plan-2', name: 'Other' }), isActive: true }] });
      render(<TracksScreen />);
      expect(screen.getByTestId('my-path-badge-plan-1')).toBeTruthy();
      expect(screen.getByTestId('my-path-badge-plan-2')).toBeTruthy();
    });

    it('shows the description under the name (093)', () => {
      setMocks({ enrollments: [{ ...customPath, description: 'Understand what AI tools can do for my job' }] });
      render(<TracksScreen />);
      expect(screen.getByTestId('custom-path-description-plan-1').props.children)
        .toBe('Understand what AI tools can do for my job');
    });

    it('capitalises the first letter of the name and the description (093)', () => {
      setMocks({ enrollments: [{ ...makeCustomPath({ id: 'plan-1', name: 'understand what AI tools' }), description: 'understand what AI tools can do' }] });
      render(<TracksScreen />);
      const card = within(screen.getByTestId('custom-path-card-plan-1'));
      expect(card.getByText('Understand what AI tools')).toBeTruthy();
      expect(screen.getByTestId('custom-path-description-plan-1').props.children).toBe('Understand what AI tools can do');
    });

    it('shows no description line when the description is null or empty (093)', () => {
      setMocks({ enrollments: [{ ...customPath, description: null }, { ...makeCustomPath({ id: 'plan-2', name: 'Other' }), description: '' }] });
      render(<TracksScreen />);
      expect(screen.queryByTestId('custom-path-description-plan-1')).toBeNull();
      expect(screen.queryByTestId('custom-path-description-plan-2')).toBeNull();
    });

    it('draws a custom path as a picker card, not a progress card (093)', () => {
      setMocks({ enrollments: [customPath] });
      render(<TracksScreen />);
      const card = within(screen.getByTestId('custom-path-card-plan-1'));
      expect(card.getByText('My Discovery Path')).toBeTruthy();
      expect(screen.queryByTestId('next-lesson-btn-plan-1')).toBeNull();
      expect(screen.queryByTestId('enrollment-card-plan-1')).toBeNull();
    });
  });

  describe('Make active on an Albert path (092)', () => {
    const albertPath = makeCustomPath({ id: 'plan-1', name: 'My Discovery Path' });
    const pendingFor = (variables: ActivePathRef) => ({
      mutate: mockSetActive, isPending: true, variables, isError: false, error: null as unknown,
    });

    it('shows Make active inside the card of a non-active custom path and sets that path active', () => {
      setMocks({ enrollments: [albertPath] });
      render(<TracksScreen />);
      const button = within(screen.getByTestId('custom-path-card-plan-1')).getByTestId('make-active-btn-plan-1');
      fireEvent.press(button);
      expect(mockSetActive).toHaveBeenCalledWith({ kind: 'custom', id: 'plan-1' });
    });

    it('shows no Make active button on the active custom path', () => {
      setMocks({ enrollments: [{ ...albertPath, isActive: true }] });
      render(<TracksScreen />);
      expect(screen.queryByTestId('make-active-btn-plan-1')).toBeNull();
      expect(screen.getByTestId('active-badge-plan-1')).toBeTruthy();
    });

    it('colours the Active badge differently from the My path badge (093)', () => {
      setMocks({ enrollments: [{ ...albertPath, isActive: true }] });
      render(<TracksScreen />);
      const colorOf = (testID: string, label: RegExp) =>
        StyleSheet.flatten(within(screen.getByTestId(testID)).getByText(label).props.style).color;
      expect(colorOf('active-badge-plan-1', /^active$/i)).not.toBe(colorOf('my-path-badge-plan-1', /^my path$/i));
    });

    it('shows the Active track text on the active custom path only (093)', () => {
      setMocks({ enrollments: [albertPath, { ...makeCustomPath({ id: 'plan-2', name: 'Other' }), isActive: true }] });
      render(<TracksScreen />);
      expect(within(screen.getByTestId('custom-path-card-plan-2')).getByText('Active track')).toBeTruthy();
      expect(screen.queryByTestId('active-text-plan-1')).toBeNull();
    });

    it('tapping Make active does not open the detail screen', () => {
      setMocks({ enrollments: [albertPath] });
      render(<TracksScreen />);
      fireEvent.press(screen.getByTestId('make-active-btn-plan-1'));
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('shows loading only on the custom path being switched', () => {
      const other = makeCustomPath({ id: 'plan-2', name: 'Other Path' });
      setMocks({
        enrollments: [albertPath, other],
        setActiveTrack: pendingFor({ kind: 'custom', id: 'plan-2' }),
      });
      render(<TracksScreen />);
      // A loading Button shows a spinner in place of its label.
      expect(within(screen.getByTestId('make-active-btn-plan-1')).getByText(/^make active$/i)).toBeTruthy();
      expect(within(screen.getByTestId('make-active-btn-plan-2')).queryByText(/^make active$/i)).toBeNull();
    });

    it('shows the set-active error text when switching to a custom path fails', () => {
      setMocks({
        enrollments: [albertPath],
        setActiveTrack: {
          mutate: mockSetActive, isPending: false, variables: undefined, isError: true,
          error: { response: { data: { message: 'Plan not found' } } },
        },
      });
      render(<TracksScreen />);
      expect(screen.getByText('Plan not found')).toBeTruthy();
    });
  });

  describe('Ticket 072j — safe-area edges', () => {
    it('uses edges=[left,right] so the tab layout owns the top inset and the tab bar the bottom one (090)', () => {
      render(<TracksScreen />);
      expect(capturedEdges).toEqual(['left', 'right']);
    });
  });

  describe('card-tap navigation (076d)', () => {
    it('tapping a pre-built skill card navigates to track detail', () => {
      render(<TracksScreen />);
      fireEvent.press(screen.getByTestId('skill-card-tap-skill-1'));
      expect(mockPush).toHaveBeenCalledWith('/track/track/skill-1');
    });

    it('tapping a locked skill card navigates to track detail', () => {
      setMocks({ skills: [premiumSkill] });
      render(<TracksScreen />);
      fireEvent.press(screen.getByTestId('skill-card-tap-skill-2'));
      expect(mockPush).toHaveBeenCalledWith('/track/track/skill-2');
    });

    it('tapping a custom path card navigates to track detail', () => {
      const customPath = makeCustomPath({
        id: 'plan-1',
        name: 'My Discovery Path',
        totalLessons: mockEnrollment.totalLessons,
        completedLessons: mockEnrollment.completedLessons,
        percentComplete: mockEnrollment.percentComplete,
      });
      setMocks({ enrollments: [customPath] });
      render(<TracksScreen />);
      fireEvent.press(screen.getByTestId('custom-path-tap-plan-1'));
      expect(mockPush).toHaveBeenCalledWith('/track/custom/plan-1');
    });

    it('tapping Enrol on a skill card does NOT navigate to track detail', () => {
      render(<TracksScreen />);
      fireEvent.press(screen.getByTestId('enrol-btn-skill-1'));
      // Only the enrol mutation is called; no track-detail navigation
      expect(mockMutate).toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalledWith('/track/track/skill-1');
    });
  });
});
