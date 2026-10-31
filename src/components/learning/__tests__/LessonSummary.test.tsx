import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useLesson } from '@/hooks/useLesson';
import { LessonSummary } from '../LessonSummary';
import type { TrackContentsLesson } from '@learning/shared';

jest.mock('@/hooks/useLesson', () => ({ useLesson: jest.fn() }));

const lesson: TrackContentsLesson = { id: 'l-2', title: 'Your role', lessonNumber: 2, status: 'not-started', locked: false };

function setLesson(state: { data?: unknown; isLoading?: boolean; isError?: boolean; error?: unknown }) {
  (useLesson as jest.Mock).mockReturnValue({ isLoading: false, isError: false, ...state });
}

describe('LessonSummary', () => {
  it('shows the lesson\'s summary and where the learner is with it, with nothing to start it', () => {
    setLesson({ data: { id: 'l-2', summary: 'What the PM owns in a launch.' } });
    render(<LessonSummary lesson={lesson} />);
    expect(screen.getByText('What the PM owns in a launch.')).toBeTruthy();
    expect(screen.getByText('Not started yet')).toBeTruthy();
    expect(screen.queryByText(/start lesson|continue lesson/i)).toBeNull();
  });

  it.each([['in-progress', 'In progress'], ['skipped', 'Skipped']] as const)(
    'says %s as "%s"',
    (status, caption) => {
      setLesson({ data: { id: 'l-2', summary: 'S' } });
      render(<LessonSummary lesson={{ ...lesson, status }} />);
      expect(screen.getByText(caption)).toBeTruthy();
    },
  );

  it('says so when the lesson has no summary', () => {
    setLesson({ data: { id: 'l-2' } });
    render(<LessonSummary lesson={lesson} />);
    expect(screen.getByTestId('lesson-summary-empty')).toBeTruthy();
  });

  it('shows a spinner while it loads', () => {
    setLesson({ isLoading: true });
    render(<LessonSummary lesson={lesson} />);
    expect(screen.getByTestId('lesson-summary-loading')).toBeTruthy();
  });

  it('shows the server\'s message, not an empty summary, when the load fails', () => {
    setLesson({ isError: true, error: { response: { data: { message: 'Could not load that lesson.' } } } });
    render(<LessonSummary lesson={lesson} />);
    expect(screen.getByText('Could not load that lesson.')).toBeTruthy();
    expect(screen.queryByTestId('lesson-summary-empty')).toBeNull();
  });
});
