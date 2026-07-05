import React from 'react';
import { ActivityIndicator } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import OnboardingScreen from '../onboarding';
import { useSkills, useCompleteOnboarding } from '@/hooks/useOnboarding';
import type { SkillWithAccess } from '@learning/shared';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockReplace = jest.fn();

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

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockFreeSkill: SkillWithAccess = {
  id: 'skill-1',
  name: 'Product Strategy',
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

    it('shows "Continue" button on step 1', () => {
      render(<OnboardingScreen />);
      expect(screen.getByText('CONTINUE')).toBeTruthy();
    });

    it('does not advance to step 2 if no seniority selected', () => {
      render(<OnboardingScreen />);
      fireEvent.press(screen.getByText('CONTINUE'));
      // Still on step 1 — seniority heading is still visible
      expect(screen.getByText("What's your seniority level?")).toBeTruthy();
    });

    it('advances to step 2 after selecting a seniority and pressing Continue', () => {
      render(<OnboardingScreen />);
      fireEvent.press(screen.getByTestId('seniority-SENIOR'));
      fireEvent.press(screen.getByText('CONTINUE'));
      expect(screen.queryByText("What's your seniority level?")).toBeNull();
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

    it('does not advance to step 3 if no track selected', () => {
      render(<OnboardingScreen />);
      advanceToStep2();
      fireEvent.press(screen.getByText('CONTINUE'));
      // Still on step 2
      expect(screen.getByText('Choose a track to start')).toBeTruthy();
    });

    it('advances to step 3 after selecting a track and pressing Continue', () => {
      render(<OnboardingScreen />);
      advanceToStep2();
      fireEvent.press(screen.getByTestId('skill-skill-1'));
      fireEvent.press(screen.getByText('CONTINUE'));
      expect(screen.queryByText('Choose a track to start')).toBeNull();
    });

    it('shows Back button on step 2 and returns to step 1 when pressed', () => {
      render(<OnboardingScreen />);
      advanceToStep2();
      fireEvent.press(screen.getByTestId('back-button'));
      expect(screen.getByText("What's your seniority level?")).toBeTruthy();
    });
  });

  // Step 2 — Tracks (premium user — all skills accessible)
  describe('Step 2 — Tracks (premium user)', () => {
    beforeEach(() => {
      setSkillsMock({ data: [mockFreeSkill, mockPremiumSkill] });
    });

    it('shows multi-select heading for premium user', () => {
      render(<OnboardingScreen />);
      advanceToStep2();
      expect(screen.getByText('Choose your tracks')).toBeTruthy();
    });

    it('allows selecting multiple tracks for premium user', () => {
      render(<OnboardingScreen />);
      advanceToStep2();
      fireEvent.press(screen.getByTestId('skill-skill-1'));
      fireEvent.press(screen.getByTestId('skill-skill-3'));
      // Both selected — pressing Continue should advance
      fireEvent.press(screen.getByText('CONTINUE'));
      expect(screen.queryByText('Choose your tracks')).toBeNull();
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

    it('shows all preferred time options', () => {
      render(<OnboardingScreen />);
      advanceToStep3();
      expect(screen.getByTestId('preferred-time-morning')).toBeTruthy();
      expect(screen.getByTestId('preferred-time-afternoon')).toBeTruthy();
      expect(screen.getByTestId('preferred-time-evening')).toBeTruthy();
    });

    it('shows "Get started" submit button', () => {
      render(<OnboardingScreen />);
      advanceToStep3();
      expect(screen.getByText('GET STARTED')).toBeTruthy();
    });

    it('calls mutate with correct args on submit', () => {
      render(<OnboardingScreen />);
      // Select seniority ASSOCIATE and track skill-1, then submit on step 3
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

    it('shows error banner when mutation fails', () => {
      setCompleteMock({ isError: true });
      render(<OnboardingScreen />);
      advanceToStep3();
      expect(screen.getByText('Something went wrong. Please try again.')).toBeTruthy();
    });

    it('shows loading indicator on submit button when pending', () => {
      setCompleteMock({ isPending: true });
      const { UNSAFE_getByType } = render(<OnboardingScreen />);
      advanceToStep3();
      expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    });

    it('shows Back button on step 3 and returns to step 2 when pressed', () => {
      render(<OnboardingScreen />);
      advanceToStep3();
      fireEvent.press(screen.getByTestId('back-button'));
      expect(screen.getByText('Choose a track to start')).toBeTruthy();
    });
  });

  // Navigation
  describe('Navigation after completion', () => {
    it('navigates to tabs when mutation succeeds', () => {
      setCompleteMock({ isSuccess: true });
      render(<OnboardingScreen />);
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
    });
  });
});
