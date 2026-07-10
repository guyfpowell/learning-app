import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import OnboardingScreen from '../onboarding';
import { useSkills, useCompleteOnboarding } from '@/hooks/useOnboarding';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import type { SkillWithAccess } from '@learning/shared';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockReplace = jest.fn();
const mockInvalidateQueries = jest.fn();

jest.mock('@/hooks/useOnboarding', () => ({
  useSkills: jest.fn(),
  useCompleteOnboarding: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/store/auth.store');

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockFreeSkill: SkillWithAccess = {
  id: 'skill-1',
  name: 'Product Strategy',
  premiumStatus: 'free',
  userHasAccess: true,
  enrolledSkillId: null,
  skillPaths: [],
} as unknown as SkillWithAccess;

const mockFreeSkill2: SkillWithAccess = {
  id: 'skill-4',
  name: 'Business Fundamentals',
  premiumStatus: 'free',
  userHasAccess: true,
  enrolledSkillId: null,
  skillPaths: [],
} as unknown as SkillWithAccess;

const mockLockedSkill: SkillWithAccess = {
  id: 'skill-2',
  name: 'Executive Communication',
  premiumStatus: 'premium',
  userHasAccess: false,
  enrolledSkillId: null,
  skillPaths: [],
} as unknown as SkillWithAccess;

const mockPremiumSkill: SkillWithAccess = {
  id: 'skill-3',
  name: 'Stakeholder Management',
  premiumStatus: 'premium',
  userHasAccess: true,
  enrolledSkillId: null,
  skillPaths: [],
} as unknown as SkillWithAccess;

const mockMutate = jest.fn();

function setSkillsMock(overrides: Record<string, unknown> = {}) {
  (useSkills as jest.Mock).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
    ...overrides,
  });
}

function setCompleteMock(overrides: Record<string, unknown> = {}) {
  (useCompleteOnboarding as jest.Mock).mockReturnValue({
    mutate: mockMutate,
    isPending: false,
    isError: false,
    isSuccess: false,
    error: null,
    ...overrides,
  });
}

function advanceToStep2() {
  fireEvent.press(screen.getByTestId('seniority-ASSOCIATE'));
  fireEvent.press(screen.getByText('CONTINUE'));
}

function advanceToStep3() {
  advanceToStep2();
  fireEvent.press(screen.getByTestId('skill-skill-1'));
  fireEvent.press(screen.getByText('CONTINUE'));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('OnboardingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setSkillsMock({ data: [mockFreeSkill, mockLockedSkill] });
    setCompleteMock();
    (useAuthStore as unknown as jest.Mock).mockReturnValue({ name: 'Alice' });
  });

  // Welcome greeting
  describe('Welcome greeting', () => {
    it('shows welcome greeting with user name', () => {
      render(<OnboardingScreen />);
      expect(screen.getByText('Welcome, Alice!')).toBeTruthy();
    });

    it('shows setup subtitle', () => {
      render(<OnboardingScreen />);
      expect(screen.getByText("Let's set up your learning preferences")).toBeTruthy();
    });
  });

  // Step 1 — Seniority
  describe('Step 1 — Seniority', () => {
    it('renders all seniority options', () => {
      render(<OnboardingScreen />);
      expect(screen.getByTestId('seniority-ASSOCIATE')).toBeTruthy();
      expect(screen.getByTestId('seniority-PRACTITIONER')).toBeTruthy();
      expect(screen.getByTestId('seniority-SENIOR')).toBeTruthy();
      expect(screen.getByTestId('seniority-LEAD')).toBeTruthy();
      expect(screen.getByTestId('seniority-DIRECTOR')).toBeTruthy();
    });

    it('renders web-aligned step 1 heading', () => {
      render(<OnboardingScreen />);
      expect(screen.getByText('How would you describe your experience level?')).toBeTruthy();
    });

    it('shows "Continue" button on step 1', () => {
      render(<OnboardingScreen />);
      expect(screen.getByText('CONTINUE')).toBeTruthy();
    });

    it('does not advance to step 2 if no seniority selected', () => {
      render(<OnboardingScreen />);
      fireEvent.press(screen.getByText('CONTINUE'));
      expect(screen.getByText('How would you describe your experience level?')).toBeTruthy();
    });

    it('advances to step 2 after selecting a seniority and pressing Continue', () => {
      render(<OnboardingScreen />);
      fireEvent.press(screen.getByTestId('seniority-SENIOR'));
      fireEvent.press(screen.getByText('CONTINUE'));
      expect(screen.queryByText('How would you describe your experience level?')).toBeNull();
    });
  });

  // Step 2 — Tracks (free user)
  describe('Step 2 — Tracks (free user)', () => {
    beforeEach(() => {
      setSkillsMock({ data: [mockFreeSkill, mockLockedSkill] });
    });

    it('shows loading spinner while skills load', () => {
      setSkillsMock({ isLoading: true, data: undefined });
      render(<OnboardingScreen />);
      advanceToStep2();
      expect(screen.getByTestId('tracks-loading')).toBeTruthy();
    });

    it('shows accessible skill card', () => {
      render(<OnboardingScreen />);
      advanceToStep2();
      expect(screen.getByTestId('skill-skill-1')).toBeTruthy();
      expect(screen.getByText('Product Strategy')).toBeTruthy();
    });

    it('shows locked badge on premium skill', () => {
      render(<OnboardingScreen />);
      advanceToStep2();
      expect(screen.getByTestId('skill-locked-skill-2')).toBeTruthy();
      expect(screen.getByText('🔒 Premium')).toBeTruthy();
    });

    it('shows unified step 2 heading for free user', () => {
      render(<OnboardingScreen />);
      advanceToStep2();
      expect(screen.getByText('Which tracks do you want to learn?')).toBeTruthy();
    });

    it('shows correct free user helper text with upgrade mention', () => {
      render(<OnboardingScreen />);
      advanceToStep2();
      expect(
        screen.getByText('Choose one track to get started. Upgrade to unlock all tracks.')
      ).toBeTruthy();
    });

    it('does not advance to step 3 if no track selected', () => {
      render(<OnboardingScreen />);
      advanceToStep2();
      fireEvent.press(screen.getByText('CONTINUE'));
      expect(screen.getByText('Which tracks do you want to learn?')).toBeTruthy();
    });

    it('advances to step 3 after selecting a track and pressing Continue', () => {
      render(<OnboardingScreen />);
      advanceToStep2();
      fireEvent.press(screen.getByTestId('skill-skill-1'));
      fireEvent.press(screen.getByText('CONTINUE'));
      expect(screen.queryByText('Which tracks do you want to learn?')).toBeNull();
    });

    it('shows Back button on step 2 and returns to step 1 when pressed', () => {
      render(<OnboardingScreen />);
      advanceToStep2();
      fireEvent.press(screen.getByTestId('back-button'));
      expect(screen.getByText('How would you describe your experience level?')).toBeTruthy();
    });

    it('shows upgrade modal when locked skill is tapped', () => {
      render(<OnboardingScreen />);
      advanceToStep2();
      fireEvent.press(screen.getByTestId('skill-skill-2'));
      expect(screen.getByText('Unlock all tracks with Premium')).toBeTruthy();
    });

    it('selecting a different free track replaces selection without showing upgrade modal', () => {
      // Need at least one locked skill so isPremiumUser = false (all-accessible = premium)
      setSkillsMock({ data: [mockFreeSkill, mockFreeSkill2, mockLockedSkill] });
      render(<OnboardingScreen />);
      advanceToStep2();
      fireEvent.press(screen.getByTestId('skill-skill-1'));
      fireEvent.press(screen.getByTestId('skill-skill-4'));
      expect(screen.queryByText('Unlock all tracks with Premium')).toBeNull();
    });

    it('closes upgrade modal when "Maybe later" is pressed', () => {
      render(<OnboardingScreen />);
      advanceToStep2();
      fireEvent.press(screen.getByTestId('skill-skill-2'));
      expect(screen.getByText('Unlock all tracks with Premium')).toBeTruthy();
      fireEvent.press(screen.getByText('Maybe later'));
      expect(screen.queryByText('Unlock all tracks with Premium')).toBeNull();
    });

    it('calls upgrade API and invalidates skills on "Upgrade now"', async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({});
      render(<OnboardingScreen />);
      advanceToStep2();
      fireEvent.press(screen.getByTestId('skill-skill-2'));
      // Button component uppercases all labels
      fireEvent.press(screen.getByText('UPGRADE NOW'));
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/auth/dummy-upgrade');
        expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['skills'] });
      });
    });
  });

  // Step 2 — Premium track selection with skip (free user, Chunk 5)
  describe('Step 2 (premium track selection with skip, free user)', () => {
    beforeEach(() => {
      setSkillsMock({ data: [mockFreeSkill, mockLockedSkill] });
    });

    it('selecting a premium track adds it to selection and opens the upgrade modal', () => {
      render(<OnboardingScreen />);
      advanceToStep2();
      fireEvent.press(screen.getByTestId('skill-skill-2'));
      expect(screen.getByText('Unlock all tracks with Premium')).toBeTruthy();
    });

    it('"Maybe later" closes modal, premium track stays selected, info banner appears', () => {
      render(<OnboardingScreen />);
      advanceToStep2();
      fireEvent.press(screen.getByTestId('skill-skill-2'));
      fireEvent.press(screen.getByText('Maybe later'));
      expect(screen.queryByText('Unlock all tracks with Premium')).toBeNull();
      expect(screen.getByTestId('premium-track-info-banner')).toBeTruthy();
      expect(
        screen.getByText(
          "You'll get a limited preview of premium tracks until you upgrade."
        )
      ).toBeTruthy();
    });

    it('can proceed to step 3 with a premium track selected after skipping upgrade', () => {
      render(<OnboardingScreen />);
      advanceToStep2();
      fireEvent.press(screen.getByTestId('skill-skill-2'));
      fireEvent.press(screen.getByText('Maybe later'));
      fireEvent.press(screen.getByText('CONTINUE'));
      expect(screen.queryByText('Which tracks do you want to learn?')).toBeNull();
      expect(screen.getByText('Timezone')).toBeTruthy();
    });

    it('submitting with a premium track calls mutate with the premium track id', () => {
      render(<OnboardingScreen />);
      fireEvent.press(screen.getByTestId('seniority-ASSOCIATE'));
      fireEvent.press(screen.getByText('CONTINUE'));
      fireEvent.press(screen.getByTestId('skill-skill-2'));
      fireEvent.press(screen.getByText('Maybe later'));
      fireEvent.press(screen.getByText('CONTINUE'));
      fireEvent.press(screen.getByText('GET STARTED'));
      expect(mockMutate).toHaveBeenCalledWith({
        seniority: 'ASSOCIATE',
        trackIds: ['skill-2'],
        timezone: 'UTC',
        preferredTime: 'morning',
      });
    });
  });

  // Step 2 — Tracks (premium user — all skills accessible)
  describe('Step 2 — Tracks (premium user)', () => {
    beforeEach(() => {
      setSkillsMock({ data: [mockFreeSkill, mockPremiumSkill] });
    });

    it('shows unified step 2 heading for premium user', () => {
      render(<OnboardingScreen />);
      advanceToStep2();
      expect(screen.getByText('Which tracks do you want to learn?')).toBeTruthy();
    });

    it('shows correct premium helper text', () => {
      render(<OnboardingScreen />);
      advanceToStep2();
      expect(screen.getByText('Choose as many tracks as you like.')).toBeTruthy();
    });

    it('allows selecting multiple tracks for premium user', () => {
      render(<OnboardingScreen />);
      advanceToStep2();
      fireEvent.press(screen.getByTestId('skill-skill-1'));
      fireEvent.press(screen.getByTestId('skill-skill-3'));
      fireEvent.press(screen.getByText('CONTINUE'));
      expect(screen.queryByText('Which tracks do you want to learn?')).toBeNull();
    });
  });

  // Step 3 — Timezone + Preferred Time
  describe('Step 3 — Timezone and Preferred Time', () => {
    it('shows timezone input with default UTC', () => {
      render(<OnboardingScreen />);
      advanceToStep3();
      const input = screen.getByTestId('timezone-input');
      expect(input.props.value).toBe('UTC');
    });

    it('shows timezone placeholder with format hint', () => {
      render(<OnboardingScreen />);
      advanceToStep3();
      const input = screen.getByTestId('timezone-input');
      expect(input.props.placeholder).toBe('UTC, America/New_York, etc.');
    });

    it('shows "Preferred learning time" field label', () => {
      render(<OnboardingScreen />);
      advanceToStep3();
      expect(screen.getByText('Preferred learning time')).toBeTruthy();
    });

    it('shows all preferred time options with clock times', () => {
      render(<OnboardingScreen />);
      advanceToStep3();
      expect(screen.getByTestId('preferred-time-morning')).toBeTruthy();
      expect(screen.getByTestId('preferred-time-afternoon')).toBeTruthy();
      expect(screen.getByTestId('preferred-time-evening')).toBeTruthy();
      expect(screen.getByText('Morning (8 AM)')).toBeTruthy();
      expect(screen.getByText('Afternoon (1 PM)')).toBeTruthy();
      expect(screen.getByText('Evening (7 PM)')).toBeTruthy();
    });

    it('shows "Get started" submit button', () => {
      render(<OnboardingScreen />);
      advanceToStep3();
      expect(screen.getByText('GET STARTED')).toBeTruthy();
    });

    it('shows "Saving…" text while submit is pending', () => {
      setCompleteMock({ isPending: true });
      render(<OnboardingScreen />);
      advanceToStep3();
      expect(screen.getByText('SAVING…')).toBeTruthy();
    });

    it('calls mutate with correct args on submit', () => {
      render(<OnboardingScreen />);
      fireEvent.press(screen.getByTestId('seniority-ASSOCIATE'));
      fireEvent.press(screen.getByText('CONTINUE'));
      fireEvent.press(screen.getByTestId('skill-skill-1'));
      fireEvent.press(screen.getByText('CONTINUE'));
      fireEvent.changeText(screen.getByTestId('timezone-input'), 'Europe/London');
      fireEvent.press(screen.getByTestId('preferred-time-evening'));
      fireEvent.press(screen.getByText('GET STARTED'));
      expect(mockMutate).toHaveBeenCalledWith({
        seniority: 'ASSOCIATE',
        trackIds: ['skill-1'],
        timezone: 'Europe/London',
        preferredTime: 'evening',
      });
    });

    it('shows real error message when mutation fails', () => {
      setCompleteMock({
        isError: true,
        error: { message: 'Please select your experience level' },
      });
      render(<OnboardingScreen />);
      advanceToStep3();
      expect(screen.getByText('Please select your experience level')).toBeTruthy();
    });

    it('falls back to generic message when error has no message', () => {
      setCompleteMock({ isError: true, error: null });
      render(<OnboardingScreen />);
      advanceToStep3();
      expect(screen.getByText('Something went wrong. Please try again.')).toBeTruthy();
    });

    it('shows Back button on step 3 and returns to step 2 when pressed', () => {
      render(<OnboardingScreen />);
      advanceToStep3();
      fireEvent.press(screen.getByTestId('back-button'));
      expect(screen.getByText('Which tracks do you want to learn?')).toBeTruthy();
    });
  });

  // Navigation
  describe('Navigation after completion', () => {
    it('navigates to lessons tab when mutation succeeds', () => {
      setCompleteMock({ isSuccess: true });
      render(<OnboardingScreen />);
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)/lessons');
    });
  });
});
