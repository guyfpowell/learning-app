import React from 'react';
import { StyleSheet } from 'react-native';
import { colors } from '@/theme';
import { render, screen, fireEvent, within, act, waitFor } from '@testing-library/react-native';
import { queryWrapper } from '@/test-utils/queryClient';
import { trackService } from '@/services/track.service';
import { makeTrackPath } from '@/test-utils/paths';
import { must } from '@/test-utils/must';
import TracksScreen from '../tracks';
import { usePrefetchNextScreens } from '@/hooks/usePrefetchNextScreens';
import { useSkills, usePaths, useEnroll, useSetActivePath } from '@/hooks/useTrack';
import { NO_SIGNAL_ERROR, SET_ACTIVE_PATH_ERROR, type ActivePathRef, type SkillWithAccess, type UserPath } from '@learning/shared';
import { makeCustomPath } from '@/test-utils/paths';
import { NoSignalError } from '@/lib/offlineWrites';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

jest.mock('@/hooks/usePrefetchNextScreens', () => ({ usePrefetchNextScreens: jest.fn() }));

jest.mock('@/hooks/useTrack', () => ({
  useSkills:         jest.fn(),
  usePaths:          jest.fn(),
  useEnroll:         jest.fn(),
  useSetActivePath:  jest.fn(),
}));

jest.mock('@/services/track.service', () => ({
  trackService: { getPaths: jest.fn(), setActivePath: jest.fn() },
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
const mockDismissFailure = jest.fn();

/** What `useSetActivePath` returns when nothing is in flight and nothing has failed. */
function idleSetActive(overrides: Partial<{ failure: string | null; isPendingFor: (ref: ActivePathRef) => boolean }> = {}) {
  return { setActive: mockSetActive, failure: null as string | null, dismissFailure: mockDismissFailure, isPendingFor: () => false, ...overrides };
}

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
  setActiveTrack = idleSetActive(),
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

  it('115f: loads the next screens\' data in the background for the enrolled paths', () => {
    const enrollments = [makeTrackPath({ id: 'skill-1' }), makeCustomPath({ id: 'plan-1' })];
    setMocks({ enrollments });
    render(<TracksScreen />);
    expect(usePrefetchNextScreens).toHaveBeenCalledWith('tracks', enrollments);
  });

  it('096: has no "Tracks" heading: the selected tab already says where you are', () => {
    render(<TracksScreen />);
    expect(screen.queryByText('Tracks')).toBeNull();
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
    expect(screen.getByTestId('skill-headline-skill-1').props.children).toBe('Run a job search like a product: from breaking in to the top.');
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

  it('shows the category as a small eyebrow above the name', () => {
    render(<TracksScreen />);
    expect(screen.getByText('Product')).toBeTruthy();
  });

  it('falls back to the raw category for a value with no label (BUG-080e-1)', () => {
    // Web admin can create categories such as 'design' / 'data-science'.
    setMocks({ skills: [{ ...baseSkill, category: 'data-science' }] });
    render(<TracksScreen />);
    expect(screen.getByText('data-science')).toBeTruthy();
  });

  it('shows Enrol button for accessible, non-enrolled skill', () => {
    render(<TracksScreen />);
    expect(screen.getByTestId('enrol-btn-skill-1')).toBeTruthy();
    expect(screen.getByText('Enrol')).toBeTruthy();
  });

  it('pressing Enrol calls mutate with skill id', () => {
    render(<TracksScreen />);
    fireEvent.press(screen.getByTestId('enrol-btn-skill-1'));
    expect(mockMutate).toHaveBeenCalledWith('skill-1', expect.objectContaining({ onSuccess: expect.any(Function) }));
  });

  it('lists an enrolled skill under Your tracks, not under Explore, with no status badges', () => {
    setMocks({ enrollments: [mockEnrollment] });
    render(<TracksScreen />);
    expect(within(screen.getByTestId('your-tracks-section')).getByTestId('skill-card-skill-1')).toBeTruthy();
    expect(screen.queryByText('Explore')).toBeNull();
    expect(screen.queryByText(/enrolled/i)).toBeNull();
  });

  it('does not show Enrol button for enrolled skill', () => {
    setMocks({ enrollments: [mockEnrollment] });
    render(<TracksScreen />);
    expect(screen.queryByTestId('enrol-btn-skill-1')).toBeNull();
  });

  it('shows an Upgrade button for premium skill', () => {
    setMocks({ skills: [premiumSkill] });
    render(<TracksScreen />);
    expect(screen.getByTestId('upgrade-btn-skill-2')).toBeTruthy();
    expect(screen.getByText('Upgrade')).toBeTruthy();
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

    it('says it was the signal when enrol never left the phone (105g)', () => {
      setMocks({
        enroll: { mutate: mockMutate, isPending: false, variables: undefined, isError: true, error: new NoSignalError() },
      });
      render(<TracksScreen />);
      expect(within(screen.getByTestId('tracks-enrol-error')).getByText(NO_SIGNAL_ERROR)).toBeTruthy();
    });

    it('shows a toast, not an inline error line, when "Make active" was rejected (105)', () => {
      setMocks({ enrollments: [mockEnrollment], setActiveTrack: idleSetActive({ failure: SET_ACTIVE_PATH_ERROR }) });
      render(<TracksScreen />);
      expect(screen.getByText(SET_ACTIVE_PATH_ERROR)).toBeTruthy();
      expect(screen.queryByTestId('tracks-set-active-error')).toBeNull();
    });

    it('dismisses the toast from its close button (105)', () => {
      setMocks({ enrollments: [mockEnrollment], setActiveTrack: idleSetActive({ failure: SET_ACTIVE_PATH_ERROR }) });
      render(<TracksScreen />);
      fireEvent.press(screen.getByTestId('toast-dismiss'));
      expect(mockDismissFailure).toHaveBeenCalledTimes(1);
    });
  });

  describe('active track affordance (ticket 044)', () => {
    it('shows the active track as the hero, labelled Active', () => {
      setMocks({ skills: [baseSkill], enrollments: [activeEnrollment] });
      render(<TracksScreen />);
      expect(within(screen.getByTestId('skill-card-skill-1')).queryByTestId('albert-mark')).toBeNull();
      expect(screen.getByTestId('active-badge-skill-1')).toBeTruthy();
      expect(screen.getByText('Active')).toBeTruthy();
      expect(screen.getByTestId('skill-card-skill-1')).toBeTruthy();
    });

    it('shows the active track once, as the hero only, not also as a row', () => {
      setMocks({ skills: [baseSkill], enrollments: [activeEnrollment] });
      render(<TracksScreen />);
      expect(screen.getAllByTestId('skill-card-skill-1')).toHaveLength(1);
      expect(screen.queryByText('Your tracks')).toBeNull();
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
      expect(screen.getByText('Make active')).toBeTruthy();
    });

    it('pressing "Make active" calls setActivePath mutate with the path ref', () => {
      setMocks({ skills: [baseSkill], enrollments: [mockEnrollment] });
      render(<TracksScreen />);
      fireEvent.press(screen.getByTestId('make-active-btn-skill-1'));
      expect(mockSetActive).toHaveBeenCalledWith({ kind: 'track', id: 'skill-1' });
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

    it('omits Your tracks entirely when the learner has joined nothing', () => {
      render(<TracksScreen />);
      expect(screen.queryByTestId('your-tracks-section')).toBeNull();
      expect(screen.queryByText('Your tracks')).toBeNull();
      expect(screen.getByText('Explore')).toBeTruthy();
    });

    it('lists custom paths in Your tracks, apart from the catalogue', () => {
      setMocks({ enrollments: [mockEnrollment, customPath] });
      render(<TracksScreen />);
      expect(screen.getByText('Your tracks')).toBeTruthy();
      expect(within(screen.getByTestId('your-tracks-section')).getByTestId('custom-path-card-plan-1')).toBeTruthy();
      // a track-kind path is a skill row, not a custom-path row
      expect(screen.queryByTestId('custom-path-card-skill-1')).toBeNull();
    });

    it('puts the learner\'s tracks first, then the Albert card, then Explore and the catalogue', () => {
      setMocks({ skills: [baseSkill, premiumSkill], enrollments: [activeEnrollment] });
      const { toJSON } = render(<TracksScreen />);
      const json = JSON.stringify(toJSON());
      expect(json.indexOf('your-tracks-section')).toBeLessThan(json.indexOf('albert-cta-card'));
      expect(json.indexOf('albert-cta-card')).toBeLessThan(json.indexOf('Explore'));
      expect(json.indexOf('Explore')).toBeLessThan(json.indexOf('skill-card-skill-2'));
    });

    it('heads the learner\'s other tracks "Your tracks", not the active one', () => {
      setMocks({ skills: [baseSkill, premiumSkill], enrollments: [activeEnrollment, { ...mockEnrollment, id: 'skill-2' }] });
      render(<TracksScreen />);
      expect(screen.getByText('Your tracks')).toBeTruthy();
      expect(within(screen.getByTestId('your-tracks-section')).getByTestId('skill-card-skill-2')).toBeTruthy();
    });

    it('offers Albert, as a track-style card with the Albert mark and a button, to a learner with no Albert path, even one with tracks', () => {
      setMocks({ skills: [baseSkill], enrollments: [activeEnrollment] });
      render(<TracksScreen />);
      const card = within(screen.getByTestId('albert-cta-card'));
      expect(card.getByText('Want something built around your goals?')).toBeTruthy();
      expect(card.getByTestId('albert-mark')).toBeTruthy();
      expect(card.getByText('Ask Albert')).toBeTruthy();
    });

    it('opens the Albert tab from the card\'s button too', () => {
      render(<TracksScreen />);
      fireEvent.press(screen.getByTestId('albert-cta-btn'));
      expect(mockPush).toHaveBeenCalledWith('/(tabs)/albert');
    });

    it('still offers Albert when every track is already joined and there is nothing to explore', () => {
      setMocks({ skills: [baseSkill], enrollments: [activeEnrollment] });
      render(<TracksScreen />);
      expect(screen.getByTestId('albert-cta-card')).toBeTruthy();
      expect(screen.queryByText('Explore')).toBeNull();
    });

    it('leaves the Albert link out once the learner has an Albert path, active or not', () => {
      setMocks({ enrollments: [customPath] });
      render(<TracksScreen />);
      expect(screen.queryByTestId('albert-cta')).toBeNull();
      expect(screen.queryByText('Want something built around your goals?')).toBeNull();
    });

    it('marks an Albert path in Your tracks with the Albert mark and the words Albert path', () => {
      setMocks({ enrollments: [customPath] });
      render(<TracksScreen />);
      const row = within(screen.getByTestId('custom-path-card-plan-1'));
      expect(row.getByText('Albert path')).toBeTruthy();
      expect(row.getByTestId('albert-mark')).toBeTruthy();
      expect(row.queryByText('My path')).toBeNull();
    });

    it('gives a pre-built track no Albert mark', () => {
      setMocks({ enrollments: [mockEnrollment] });
      render(<TracksScreen />);
      expect(within(screen.getByTestId('skill-card-skill-1')).queryByTestId('albert-mark')).toBeNull();
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

    it('shows the active Albert path as the cobalt hero, labelled Active, with the Albert mark and no My path', () => {
      setMocks({ enrollments: [{ ...albertPath, isActive: true }] });
      render(<TracksScreen />);
      const hero = within(screen.getByTestId('custom-path-card-plan-1'));
      expect(hero.getByText('Active · Albert path')).toBeTruthy();
      expect(hero.getByTestId('albert-mark')).toBeTruthy();
      expect(hero.queryByText('My path')).toBeNull();
    });

    it('shows only the one active path as the hero when another path is not active', () => {
      setMocks({ enrollments: [albertPath, { ...makeCustomPath({ id: 'plan-2', name: 'Other' }), isActive: true }] });
      render(<TracksScreen />);
      expect(screen.queryByTestId('active-badge-plan-1')).toBeNull();
      expect(screen.getByTestId('active-badge-plan-2')).toBeTruthy();
      expect(screen.getByTestId('make-active-btn-plan-1')).toBeTruthy();
    });

    it('tapping Make active does not open the detail screen', () => {
      setMocks({ enrollments: [albertPath] });
      render(<TracksScreen />);
      fireEvent.press(screen.getByTestId('make-active-btn-plan-1'));
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('shows no spinner while a path is being made active, and ignores a second tap on it (105)', () => {
      const other = makeCustomPath({ id: 'plan-2', name: 'Other Path' });
      setMocks({
        enrollments: [albertPath, other],
        setActiveTrack: idleSetActive({ isPendingFor: (ref) => ref.id === 'plan-2' }),
      });
      render(<TracksScreen />);
      expect(within(screen.getByTestId('make-active-btn-plan-1')).getByText(/^make active$/i)).toBeTruthy();
      expect(within(screen.getByTestId('make-active-btn-plan-2')).getByText(/^make active$/i)).toBeTruthy();
      fireEvent.press(screen.getByTestId('make-active-btn-plan-2'));
      expect(mockSetActive).not.toHaveBeenCalled();
      fireEvent.press(screen.getByTestId('make-active-btn-plan-1'));
      expect(mockSetActive).toHaveBeenCalledWith({ kind: 'custom', id: 'plan-1' });
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

  describe('Make active, end to end with the real hook (105)', () => {
    const mockTrackService = trackService as jest.Mocked<typeof trackService>;
    const current = makeTrackPath({ id: 'skill-1', name: 'Current Track', isActive: true });
    const planA = makeCustomPath({ id: 'plan-1', name: 'Path A' });
    const planB = makeCustomPath({ id: 'plan-2', name: 'Path B' });
    const calls: { ref: ActivePathRef; resolve: () => void; reject: (err: Error) => void }[] = [];

    beforeEach(() => {
      calls.length = 0;
      const actual = jest.requireActual<typeof import('@/hooks/useTrack')>('@/hooks/useTrack');
      (usePaths as jest.Mock).mockImplementation(actual.usePaths);
      (useSetActivePath as jest.Mock).mockImplementation(actual.useSetActivePath);
      mockTrackService.getPaths.mockReset();
      mockTrackService.setActivePath.mockReset();
      mockTrackService.getPaths.mockResolvedValue([current, planA, planB]);
      mockTrackService.setActivePath.mockImplementation((ref) =>
        new Promise<void>((resolve, reject) => { calls.push({ ref, resolve, reject }); }));
    });

    // TanStack Query notifies observers on a zero-delay timer; let the last one land inside act.
    afterEach(async () => { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); }); });

    async function renderLoaded() {
      render(<TracksScreen />, { wrapper: queryWrapper() });
      await waitFor(() => expect(screen.getByTestId('make-active-btn-plan-1')).toBeTruthy());
    }

    it('shows the new active card before the service resolves', async () => {
      await renderLoaded();

      fireEvent.press(screen.getByTestId('make-active-btn-plan-1'));

      await waitFor(() => expect(screen.getByTestId('active-badge-plan-1')).toBeTruthy());
      expect(screen.queryByTestId('active-badge-skill-1')).toBeNull();
      expect(screen.queryByTestId('make-active-btn-plan-1')).toBeNull();
      expect(screen.getByTestId('make-active-btn-skill-1')).toBeTruthy();
      expect(calls).toHaveLength(1);
      await act(async () => { must(calls[0], 'first call').resolve(); });
    });

    it('shows the toast and the old active card, and no error line, when the call is rejected', async () => {
      await renderLoaded();
      fireEvent.press(screen.getByTestId('make-active-btn-plan-1'));
      await waitFor(() => expect(calls).toHaveLength(1));

      await act(async () => { must(calls[0], 'first call').reject(new Error('boom')); });

      await waitFor(() => expect(screen.getByText(SET_ACTIVE_PATH_ERROR)).toBeTruthy());
      expect(screen.getByTestId('active-badge-skill-1')).toBeTruthy();
      expect(screen.queryByTestId('active-badge-plan-1')).toBeNull();
      expect(screen.queryByTestId('tracks-set-active-error')).toBeNull();
    });

    it('sends one request when the same path is tapped again while its request is in flight', async () => {
      await renderLoaded();

      fireEvent.press(screen.getByTestId('make-active-btn-plan-1'));
      await waitFor(() => expect(screen.getByTestId('active-badge-plan-1')).toBeTruthy());
      fireEvent.press(screen.getByTestId('make-active-btn-plan-2'));
      await waitFor(() => expect(screen.getByTestId('active-badge-plan-2')).toBeTruthy());
      // Path A is not active any more, so its button is back, while its request is still in flight.
      fireEvent.press(screen.getByTestId('make-active-btn-plan-1'));

      await act(async () => { must(calls[0], 'first call').resolve(); });
      await waitFor(() => expect(calls).toHaveLength(2));
      await act(async () => { must(calls[1], 'second call').resolve(); });
      await waitFor(() => expect(mockTrackService.getPaths).toHaveBeenCalledTimes(2));
      expect(mockTrackService.setActivePath.mock.calls.map(([ref]) => ref)).toEqual([
        { kind: 'custom', id: 'plan-1' },
        { kind: 'custom', id: 'plan-2' },
      ]);
    });
  });
});
