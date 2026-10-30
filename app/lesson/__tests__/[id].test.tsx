import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { colors, fontSize, spacing } from '@/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import LessonDetailScreen from '../[id]';
import { useLesson } from '@/hooks/useLesson';
import { usePaths } from '@/hooks/useTrack';
import { lessonService } from '@/services/lesson.service';
import { useStartRetake } from '@/hooks/useLesson';
import { LESSON_COMPLETED_BANNER, RETAKE_START_ERROR } from '@learning/shared';
import { extractError } from '@/lib/errors';
import * as Sentry from '@sentry/react-native';

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(),
}));
jest.mock('@/hooks/useLesson');
jest.mock('@/hooks/useTrack');
jest.mock('@/components/QuizModal', () => ({
  QuizModal: () => null,
}));
jest.mock('@/components/ui/LessonRatingControl', () => {
  const { Text } = require('react-native');
  return { LessonRatingControl: ({ rating }: { rating: string | null }) => <Text testID="rating-stub">{String(rating)}</Text> };
});
jest.mock('@/components/ui/BookmarkButton', () => {
  const { Pressable } = require('react-native');
  return {
    BookmarkButton: ({ saved, onToggle }: { saved: boolean; onToggle: () => void }) =>
      <Pressable testID="bookmark-stub" accessibilityState={{ checked: saved }} onPress={onToggle} />,
  };
});
// The screen writes the read position on mount; without this mock it went out over the real API client.
jest.mock('@/services/lesson.service', () => ({
  lessonService: { updatePosition: jest.fn().mockResolvedValue(undefined) },
}));

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true };

const mockLesson = {
  id: 'lesson-1',
  title: 'Test Lesson',
  difficulty: 'beginner' as const,
  durationMinutes: 10,
  isTeaser: false,
  content: 'You are presenting a strategy to the board when the CFO asks why growth has stalled.',
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
  kind: 'track' as const,
  id: 'skill-1',
  name: 'Product Management',
  skill: { name: 'Product Management' },
  percentComplete: 40,
  levels: [],
  completedLessons: 2,
  totalLessons: 5,
};

beforeEach(() => {
  jest.clearAllMocks();
  // A plain rejection outlives its test, so each test starts from the resolving default.
  (lessonService.updatePosition as jest.Mock).mockResolvedValue(undefined);
  (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'lesson-1' });
  (useRouter as jest.Mock).mockReturnValue(mockRouter);
  (usePaths as jest.Mock).mockReturnValue({ data: [] });
  (useStartRetake as jest.Mock).mockReturnValue({ mutate: jest.fn(), isPending: false });
});

describe('LessonDetailScreen', () => {
  // Refactor C6: the write's failure used to be swallowed by an empty catch.
  it('leaves a breadcrumb when the position save fails, without telling the user', async () => {
    (lessonService.updatePosition as jest.Mock).mockRejectedValue(new Error('offline'));
    (useLesson as jest.Mock).mockReturnValue({ data: mockLesson, isLoading: false, error: null });
    render(<LessonDetailScreen />);
    await waitFor(() => expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({
      category: 'lesson', message: 'Position save failed', data: expect.objectContaining({ lessonId: 'lesson-1' }),
    })));
  });

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
    expect(screen.queryByTestId('lesson-content')).toBeNull();

    // Press Continue to expand
    fireEvent.press(screen.getByTestId('continue-btn'));
    expect(screen.getByTestId('lesson-content')).toBeTruthy();
    expect(screen.getByText(mockLesson.content)).toBeTruthy();
    // Summary hidden once the body is on screen
    expect(screen.queryByTestId('lesson-summary')).toBeNull();
  });

  it('085a: the card carries no level badge and no duration; the header badge stays', () => {
    (useLesson as jest.Mock).mockReturnValue({
      isLoading: false, isError: false, data: mockLesson, error: null,
    });
    render(<LessonDetailScreen />);
    expect(screen.getAllByText('BEGINNER')).toHaveLength(1);
    expect(screen.queryByText('10 minutes')).toBeNull();
  });

  // 073b Chunk 2: isTeaser is deprecated and no longer read by any client.
  it('never shows a "Free preview" badge, even when the legacy isTeaser column is true', () => {
    (useLesson as jest.Mock).mockReturnValue({
      isLoading: false, isError: false,
      data: { ...mockLesson, isTeaser: true },
      error: null,
    });
    render(<LessonDetailScreen />);
    expect(screen.queryByTestId('teaser-badge')).toBeNull();
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

    // Press Continue → expanded: summary hidden
    fireEvent.press(screen.getByTestId('continue-btn'));
    expect(screen.queryByTestId('continue-btn')).toBeNull();
    expect(screen.getByTestId('key-takeaway-btn')).toBeTruthy();
    expect(screen.queryByTestId('lesson-summary')).toBeNull();

    // Press Key Takeaway → takeaway: summary still hidden
    fireEvent.press(screen.getByTestId('key-takeaway-btn'));
    expect(screen.queryByTestId('key-takeaway-btn')).toBeNull();
    expect(screen.queryByTestId('lesson-summary')).toBeNull();
    // 085a: no banner on a first pass before the quiz
    expect(screen.queryByTestId('lesson-completed-banner')).toBeNull();
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
    expect(screen.getByTestId('lesson-completed-banner')).toHaveTextContent(LESSON_COMPLETED_BANNER);
    expect(screen.getByTestId('lesson-quiz-btn')).toBeTruthy();
  });

  it('085a: no completed banner while a retake is in progress', () => {
    (useLesson as jest.Mock).mockReturnValue({
      isLoading: false, isError: false,
      data: { ...mockLesson, quizCompleted: true, lessonRetakeInProgress: true },
      error: null,
    });
    render(<LessonDetailScreen />);
    expect(screen.getByTestId('lesson-quiz-btn')).toBeTruthy();
    expect(screen.queryByTestId('lesson-completed-banner')).toBeNull();
  });

  it('079f: a completed lesson shows the thumbs with the stored verdict, whatever phase it opens at', () => {
    (useLesson as jest.Mock).mockReturnValue({
      isLoading: false, isError: false,
      data: { ...mockLesson, quizCompleted: true, rating: 'up' },
      error: null,
    });
    render(<LessonDetailScreen />);
    expect(screen.getByTestId('rating-stub').props.children).toBe('up');
  });

  it('079f: a lesson that is not completed shows no thumbs', () => {
    (useLesson as jest.Mock).mockReturnValue({
      isLoading: false, isError: false,
      data: { ...mockLesson, quizCompleted: false, rating: null },
      error: null,
    });
    render(<LessonDetailScreen />);
    expect(screen.queryByTestId('rating-stub')).toBeNull();
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
        data: { code: 'LESSON_005', error: 'Teaser limit', details: { teasersUsed: 2, teasersRemaining: 1 } },
      },
      message: 'Request failed with status code 403',
    };
    (useLesson as jest.Mock).mockReturnValue({
      isLoading: false, isError: true, data: undefined, error: err,
    });
    render(<LessonDetailScreen />);
    expect(screen.getByTestId('premium-error-card')).toBeTruthy();
  });

  it('shows the teaser counts the API sends in details (080i)', () => {
    const err = {
      isAxiosError: true,
      response: {
        status: 403,
        data: { code: 'LESSON_005', error: 'Teaser limit', details: { teasersUsed: 2, teasersRemaining: 1 } },
      },
      message: 'Request failed with status code 403',
    };
    (useLesson as jest.Mock).mockReturnValue({
      isLoading: false, isError: true, data: undefined, error: err,
    });
    render(<LessonDetailScreen />);
    fireEvent.press(screen.getByText('Learn more'));
    expect(screen.getByText(/You've used 2 of 3 free previews\. Upgrade to continue learning\./)).toBeTruthy();
    expect(screen.getByText(/1 free preview remaining/)).toBeTruthy();
    // 080i BUG-2: the budget is lifetime, never monthly
    expect(screen.queryByText(/this month/)).toBeNull();
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

  it('shows fixed copy, never the transport text, when a load fails with no response', () => {
    const err = { isAxiosError: true, code: 'ERR_NETWORK', message: 'Network Error' };
    (useLesson as jest.Mock).mockReturnValue({
      isLoading: false, isError: true, data: undefined, error: err,
    });
    render(<LessonDetailScreen />);
    expect(screen.getByTestId('lesson-error')).toHaveTextContent(extractError(err));
    expect(screen.queryByText('Network Error')).toBeNull();
  });

  describe('lesson article (096)', () => {
    const style = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style);
    const article = { ...mockLesson, content: 'First paragraph.\n\nSecond paragraph.\n\n\nThird paragraph.' };
    const open = (lesson = mockLesson) => {
      (useLesson as jest.Mock).mockReturnValue({ isLoading: false, isError: false, data: lesson, error: null });
      render(<LessonDetailScreen />);
    };

    it('has no bookmark', () => {
      open();
      expect(screen.queryByTestId('bookmark-stub')).toBeNull();
    });

    it('sits on the page, not in a card: no fill, no shadow', () => {
      open();
      const { backgroundColor, shadowOpacity, elevation } = style('lesson-card');
      expect([backgroundColor, shadowOpacity, elevation]).toEqual([undefined, undefined, undefined]);
    });

    it('keeps the title and the copy on one left edge', () => {
      open();
      fireEvent.press(screen.getByTestId('continue-btn'));
      expect(style('lesson-title-row').paddingHorizontal).toBeUndefined();
      expect(style('lesson-title').marginLeft).toBeUndefined();
      expect(style('lesson-content').marginLeft).toBeUndefined();
      expect(style('lesson-card').paddingHorizontal).toBe(spacing.sm);
    });

    it('leaves the copy left-aligned, not justified', () => {
      open();
      expect(style('lesson-summary').textAlign).toBeUndefined();
      fireEvent.press(screen.getByTestId('continue-btn'));
      expect(style('lesson-paragraph').textAlign).toBeUndefined();
    });

    it('splits the body into paragraphs, spaced by a gap rather than blank lines', () => {
      open(article);
      fireEvent.press(screen.getByTestId('continue-btn'));
      expect(screen.getAllByTestId('lesson-paragraph').map((p) => p.props.children)).toEqual([
        'First paragraph.', 'Second paragraph.', 'Third paragraph.',
      ]);
      expect(style('lesson-content').gap).toBe(spacing.sm3);
    });

    it('sets the title larger than the body copy', () => {
      open();
      fireEvent.press(screen.getByTestId('continue-btn'));
      expect(style('lesson-title').fontSize).toBe(fontSize.lg);
      expect(style('lesson-title').fontSize).toBeGreaterThan(style('lesson-paragraph').fontSize);
    });
  });

  it('renders track header with enrollment name and progress', () => {
    (useLesson as jest.Mock).mockReturnValue({
      isLoading: false, isError: false, data: mockLesson, error: null,
    });
    (usePaths as jest.Mock).mockReturnValue({ data: [mockEnrollment] });
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
    expect(screen.getByText('Lesson 1 of 5')).toBeTruthy();
    expect(screen.queryByText(/·/)).toBeNull();
  });

  describe('091a: coral actions', () => {
    const bg = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style).backgroundColor;
    const completedLesson = { ...mockLesson, quizCompleted: true, quizzes: [{ id: 'q1' }], resolvedQuizIds: ['q1'] };

    it('Continue and Key Takeaway are coral', () => {
      (useLesson as jest.Mock).mockReturnValue({ isLoading: false, isError: false, data: mockLesson, error: null });
      render(<LessonDetailScreen />);
      expect(bg('continue-btn')).toBe(colors.coral);
      fireEvent.press(screen.getByTestId('continue-btn'));
      expect(bg('key-takeaway-btn')).toBe(colors.coral);
    });

    it('Test My Knowledge is coral and Retake is not', async () => {
      (useLesson as jest.Mock).mockReturnValue({ isLoading: false, isError: false, data: completedLesson, error: null });
      render(<LessonDetailScreen />);
      await waitFor(() => expect(screen.getByTestId('lesson-retake-btn')).toBeTruthy());
      expect(bg('lesson-quiz-btn')).toBe(colors.coral);
      expect(bg('lesson-retake-btn')).not.toBe(colors.coral);
    });
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
    fireEvent.press(screen.getByText('Learn more'));
    fireEvent.press(screen.getByText('Upgrade now'));
    expect(mockRouter.push).toHaveBeenCalledWith('/paywall');
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

  describe('Chunk A5 — lesson body', () => {
    it('shows plain prose content with no Scenario label when expanded', () => {
      (useLesson as jest.Mock).mockReturnValue({
        isLoading: false, isError: false, data: mockLesson, error: null,
      });
      render(<LessonDetailScreen />);
      expect(screen.queryByTestId('lesson-content')).toBeNull();
      // Press Continue → expanded
      fireEvent.press(screen.getByTestId('continue-btn'));
      expect(screen.queryByText('Scenario')).toBeNull();
      expect(screen.getByTestId('lesson-content')).toBeTruthy();
      expect(screen.getByText(mockLesson.content)).toBeTruthy();
    });

    it('does not try to JSON.parse content', () => {
      (useLesson as jest.Mock).mockReturnValue({
        isLoading: false, isError: false, data: mockLesson, error: null,
      });
      render(<LessonDetailScreen />);
      fireEvent.press(screen.getByTestId('continue-btn'));
      // Structured-branch testIDs must never appear
      expect(screen.queryByTestId('lesson-introduction')).toBeNull();
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
      expect(screen.getByText('Test my knowledge')).toBeTruthy();
    });
  });

  describe('079e — Retake lesson', () => {
    const completed = { ...mockLesson, quizCompleted: true, quizzes: [{ id: 'q1' }, { id: 'q2' }], resolvedQuizIds: ['q1', 'q2'] };
    const mutate = jest.fn();

    beforeEach(() => {
      mutate.mockReset();
      (useStartRetake as jest.Mock).mockReturnValue({ mutate, isPending: false });
    });

    it('is hidden on a lesson that is not completed', () => {
      (useLesson as jest.Mock).mockReturnValue({ isLoading: false, isError: false, data: mockLesson, error: null });
      render(<LessonDetailScreen />);
      fireEvent.press(screen.getByTestId('continue-btn'));
      fireEvent.press(screen.getByTestId('key-takeaway-btn'));
      expect(screen.queryByTestId('lesson-retake-btn')).toBeNull();
    });

    it('shows on a completed lesson, starts a pass and returns to the start of the lesson', async () => {
      (useLesson as jest.Mock).mockReturnValue({ isLoading: false, isError: false, data: completed, error: null });
      mutate.mockImplementation((_id, opts) => opts.onSuccess());
      render(<LessonDetailScreen />);
      await waitFor(() => expect(screen.getByTestId('lesson-retake-btn')).toBeTruthy());
      fireEvent.press(screen.getByTestId('lesson-retake-btn'));
      expect(mutate).toHaveBeenCalledWith('lesson-1', expect.anything());
      expect(screen.getByTestId('continue-btn')).toBeTruthy();
      expect(lessonService.updatePosition).toHaveBeenCalledWith('lesson-1', 'collapsed');
    });

    it('is hidden while a retake is in progress, including one started in an earlier visit', async () => {
      (useLesson as jest.Mock).mockReturnValue({ isLoading: false, isError: false, data: { ...completed, lessonRetakeInProgress: true, resolvedQuizIds: [] }, error: null });
      render(<LessonDetailScreen />);
      await waitFor(() => expect(screen.getByTestId('lesson-quiz-btn')).toBeTruthy());
      expect(screen.queryByTestId('lesson-retake-btn')).toBeNull();
    });

    it('shows an error and stays put when the retake fails to start', async () => {
      (useLesson as jest.Mock).mockReturnValue({ isLoading: false, isError: false, data: completed, error: null });
      mutate.mockImplementation((_id, opts) => opts.onError(new Error('x')));
      render(<LessonDetailScreen />);
      await waitFor(() => expect(screen.getByTestId('lesson-retake-btn')).toBeTruthy());
      fireEvent.press(screen.getByTestId('lesson-retake-btn'));
      expect(screen.getByTestId('retake-error')).toHaveTextContent(RETAKE_START_ERROR);
      expect(screen.queryByTestId('continue-btn')).toBeNull();
    });
  });
});
