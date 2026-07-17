import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import LessonDetailScreen from '../[id]';
import { useLesson, useSaveLesson, useUnsaveLesson } from '@/hooks/useLesson';
import { useEnrollments } from '@/hooks/useTrack';

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(),
}));
jest.mock('@/hooks/useLesson');
jest.mock('@/hooks/useTrack');
jest.mock('@/components/QuizModal', () => ({
  QuizModal: () => null,
}));
jest.mock('@/components/ui/BookmarkButton', () => ({
  BookmarkButton: () => null,
}));

const mockRouter = { push: jest.fn(), replace: jest.fn() };

const mockLesson = {
  id: 'lesson-1',
  title: 'Test Lesson',
  difficulty: 'beginner' as const,
  durationMinutes: 10,
  isTeaser: false,
  content: JSON.stringify({
    introduction: 'Intro text',
    keyPoints: ['Point 1'],
    example: 'Example code',
  }),
  summary: 'A test summary',
  keyTakeaway: 'The key takeaway',
  isSaved: false,
  quizCompleted: false,
  nextLessonId: 'lesson-2',
  quizzes: [],
  skillPathId: 'sp-1',
  lessonNumber: 1,
  topicName: 'Topic One',
  lessonIndex: 1,
  totalLessons: 5,
  skillPath: { level: 'beginner', skillId: 'skill-1' },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockEnrollment = {
  skillId: 'skill-1',
  skill: { name: 'Product Management' },
  percentComplete: 40,
  completedLessons: 2,
  totalLessons: 5,
  levels: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'lesson-1' });
  (useRouter as jest.Mock).mockReturnValue(mockRouter);
  (useSaveLesson as jest.Mock).mockReturnValue({ mutate: jest.fn() });
  (useUnsaveLesson as jest.Mock).mockReturnValue({ mutate: jest.fn() });
  (useEnrollments as jest.Mock).mockReturnValue({ data: [] });
});

describe('LessonDetailScreen', () => {
  it('shows loading indicator while fetching', () => {
    (useLesson as jest.Mock).mockReturnValue({
      isLoading: true, isError: false, data: undefined, error: null,
    });
    render(<LessonDetailScreen />);
    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
    expect(screen.queryByTestId('lesson-card')).toBeNull();
  });

  it('renders lesson title and summary in collapsed state; body reveals after Continue', () => {
    (useLesson as jest.Mock).mockReturnValue({
      isLoading: false, isError: false, data: mockLesson, error: null,
    });
    render(<LessonDetailScreen />);
    expect(screen.getByTestId('lesson-title')).toBeTruthy();
    expect(screen.getByText('Test Lesson')).toBeTruthy();
    expect(screen.getByTestId('lesson-summary')).toBeTruthy();
    expect(screen.getByText('A test summary')).toBeTruthy();
    // Body not visible in collapsed state
    expect(screen.queryByTestId('lesson-introduction')).toBeNull();

    // Press Continue to expand
    fireEvent.press(screen.getByTestId('continue-btn'));
    expect(screen.getByTestId('lesson-introduction')).toBeTruthy();
    expect(screen.getByText('Intro text')).toBeTruthy();
  });

  it('renders difficulty badge and duration', () => {
    (useLesson as jest.Mock).mockReturnValue({
      isLoading: false, isError: false, data: mockLesson, error: null,
    });
    render(<LessonDetailScreen />);
    expect(screen.getAllByText('BEGINNER').length).toBeGreaterThan(0);
    expect(screen.getByText('10 minutes')).toBeTruthy();
  });

  it('shows "Free preview" badge for teaser lessons', () => {
    (useLesson as jest.Mock).mockReturnValue({
      isLoading: false, isError: false,
      data: { ...mockLesson, isTeaser: true },
      error: null,
    });
    render(<LessonDetailScreen />);
    expect(screen.getByTestId('teaser-badge')).toBeTruthy();
  });

  it('3-phase lesson flow: collapsed → expanded → takeaway', () => {
    (useLesson as jest.Mock).mockReturnValue({
      isLoading: false, isError: false, data: mockLesson, error: null,
    });
    render(<LessonDetailScreen />);

    // Collapsed: continue-btn visible, key-takeaway-btn and banner absent
    expect(screen.getByTestId('continue-btn')).toBeTruthy();
    expect(screen.queryByTestId('key-takeaway-btn')).toBeNull();
    expect(screen.queryByTestId('lesson-completed-banner')).toBeNull();

    // Press Continue → expanded
    fireEvent.press(screen.getByTestId('continue-btn'));
    expect(screen.queryByTestId('continue-btn')).toBeNull();
    expect(screen.getByTestId('key-takeaway-btn')).toBeTruthy();

    // Press Key Takeaway → takeaway
    fireEvent.press(screen.getByTestId('key-takeaway-btn'));
    expect(screen.queryByTestId('key-takeaway-btn')).toBeNull();
    expect(screen.getByTestId('lesson-completed-banner')).toBeTruthy();
    expect(screen.getByTestId('key-takeaway')).toBeTruthy();
    expect(screen.getByTestId('lesson-quiz-btn')).toBeTruthy();
  });

  it('shows completed state from load when quizCompleted is true', () => {
    (useLesson as jest.Mock).mockReturnValue({
      isLoading: false, isError: false,
      data: { ...mockLesson, quizCompleted: true },
      error: null,
    });
    render(<LessonDetailScreen />);
    expect(screen.queryByTestId('continue-btn')).toBeNull();
    expect(screen.queryByTestId('key-takeaway-btn')).toBeNull();
    expect(screen.getByTestId('lesson-completed-banner')).toBeTruthy();
    expect(screen.getByTestId('lesson-quiz-btn')).toBeTruthy();
  });

  it('shows premium error card for LESSON_004', () => {
    const err = {
      isAxiosError: true,
      response: { status: 403, data: { code: 'LESSON_004', message: 'Premium required' } },
      message: 'Request failed with status code 403',
    };
    (useLesson as jest.Mock).mockReturnValue({
      isLoading: false, isError: true, data: undefined, error: err,
    });
    render(<LessonDetailScreen />);
    expect(screen.getByTestId('premium-error-card')).toBeTruthy();
    expect(screen.queryByTestId('lesson-error')).toBeNull();
  });

  it('shows premium error card for LESSON_005 (teaser limit reached)', () => {
    const err = {
      isAxiosError: true,
      response: {
        status: 403,
        data: { code: 'LESSON_005', message: 'Teaser limit', teasersUsed: 3 },
      },
      message: 'Request failed with status code 403',
    };
    (useLesson as jest.Mock).mockReturnValue({
      isLoading: false, isError: true, data: undefined, error: err,
    });
    render(<LessonDetailScreen />);
    expect(screen.getByTestId('premium-error-card')).toBeTruthy();
  });

  it('shows "Lesson not found" for 404', () => {
    const err = {
      isAxiosError: true,
      response: { status: 404, data: { message: 'Not found' } },
      message: 'Request failed with status code 404',
    };
    (useLesson as jest.Mock).mockReturnValue({
      isLoading: false, isError: true, data: undefined, error: err,
    });
    render(<LessonDetailScreen />);
    expect(screen.getByTestId('lesson-not-found')).toBeTruthy();
    expect(screen.getByText('Lesson not found')).toBeTruthy();
    expect(screen.queryByTestId('premium-error-card')).toBeNull();
  });

  it('shows API error message for generic errors', () => {
    const err = {
      isAxiosError: true,
      response: { status: 500, data: { message: 'Internal server error' } },
      message: 'Request failed with status code 500',
    };
    (useLesson as jest.Mock).mockReturnValue({
      isLoading: false, isError: true, data: undefined, error: err,
    });
    render(<LessonDetailScreen />);
    expect(screen.getByTestId('lesson-error')).toBeTruthy();
    expect(screen.getByText('Internal server error')).toBeTruthy();
  });

  it('renders track header with enrollment name and progress', () => {
    (useLesson as jest.Mock).mockReturnValue({
      isLoading: false, isError: false, data: mockLesson, error: null,
    });
    (useEnrollments as jest.Mock).mockReturnValue({ data: [mockEnrollment] });
    render(<LessonDetailScreen />);
    expect(screen.getByTestId('track-header')).toBeTruthy();
    expect(screen.getByText('Product Management')).toBeTruthy();
    expect(screen.getByText('40% complete')).toBeTruthy();
  });

  it('renders topic name and lesson counter as separate elements in track meta', () => {
    (useLesson as jest.Mock).mockReturnValue({
      isLoading: false, isError: false, data: mockLesson, error: null,
    });
    render(<LessonDetailScreen />);
    expect(screen.getByText('Topic One')).toBeTruthy();
    expect(screen.getByText('· Lesson 1 of 5')).toBeTruthy();
  });

  it('navigates to settings when upgrade is pressed in premium modal', () => {
    const err = {
      isAxiosError: true,
      response: { status: 403, data: { code: 'LESSON_004', message: 'Premium required' } },
      message: 'Request failed with status code 403',
    };
    (useLesson as jest.Mock).mockReturnValue({
      isLoading: false, isError: true, data: undefined, error: err,
    });
    render(<LessonDetailScreen />);
    fireEvent.press(screen.getByText('LEARN MORE'));
    fireEvent.press(screen.getByText('UPGRADE NOW'));
    expect(mockRouter.push).toHaveBeenCalledWith('/(tabs)/settings');
  });

  describe('Chunk 5 — levelLabel display', () => {
    it('shows levelLabel in level badge when set', () => {
      (useLesson as jest.Mock).mockReturnValue({
        isLoading: false, isError: false,
        data: {
          ...mockLesson,
          skillPath: { level: 'beginner', skillId: 'skill-1', levelLabel: 'Breaking into product' },
        },
        error: null,
      });
      render(<LessonDetailScreen />);
      expect(screen.getAllByText('BREAKING INTO PRODUCT').length).toBeGreaterThan(0);
    });

    it('falls back to canonical level name when levelLabel is null', () => {
      (useLesson as jest.Mock).mockReturnValue({
        isLoading: false, isError: false,
        data: {
          ...mockLesson,
          skillPath: { level: 'beginner', skillId: 'skill-1', levelLabel: null },
        },
        error: null,
      });
      render(<LessonDetailScreen />);
      expect(screen.getAllByText('BEGINNER').length).toBeGreaterThan(0);
    });
  });

  describe('Chunk 2 — 3-phase flow', () => {
    it('media hidden in collapsed and takeaway phases, visible in expanded', () => {
      const lesson = { ...mockLesson, mediaUrl: 'https://example.com/image.jpg' };
      (useLesson as jest.Mock).mockReturnValue({
        isLoading: false, isError: false, data: lesson, error: null,
      });
      render(<LessonDetailScreen />);
      // Collapsed: no media
      expect(screen.queryByTestId('lesson-media')).toBeNull();
      // Press Continue → expanded: media visible
      fireEvent.press(screen.getByTestId('continue-btn'));
      expect(screen.getByTestId('lesson-media')).toBeTruthy();
      // Press Key Takeaway → takeaway: media hidden
      fireEvent.press(screen.getByTestId('key-takeaway-btn'));
      expect(screen.queryByTestId('lesson-media')).toBeNull();
    });

    it('shows "TEST MY KNOWLEDGE" button label in takeaway phase', () => {
      (useLesson as jest.Mock).mockReturnValue({
        isLoading: false, isError: false, data: mockLesson, error: null,
      });
      render(<LessonDetailScreen />);
      fireEvent.press(screen.getByTestId('continue-btn'));
      fireEvent.press(screen.getByTestId('key-takeaway-btn'));
      expect(screen.getByText('TEST MY KNOWLEDGE')).toBeTruthy();
    });
  });
});
