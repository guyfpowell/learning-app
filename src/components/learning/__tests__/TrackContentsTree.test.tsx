import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { TrackContentsTree } from '../TrackContentsTree';
import type { TrackContents } from '@learning/shared';

const lesson1 = { id: 'l-1', title: 'What is PM?',      lessonNumber: 1, status: 'complete'     as const, locked: false };
const lesson2 = { id: 'l-2', title: 'Your role',         lessonNumber: 2, status: 'in-progress'  as const, locked: false };
const lesson3 = { id: 'l-3', title: 'Premium lesson',    lessonNumber: 3, status: 'not-started'  as const, locked: true  };
const lesson4 = { id: 'l-4', title: 'Skipped lesson',    lessonNumber: 4, status: 'skipped'      as const, locked: false };
const lesson5 = { id: 'l-5', title: 'Roadmaps',          lessonNumber: 5, status: 'not-started'  as const, locked: false };

const mockContents: TrackContents = {
  kind: 'track',
  id:   'skill-1',
  name: 'Product Strategy',
  enrolled: true,
  groups: [
    {
      key:              'beginner',
      label:            'Beginner',
      completedLessons: 2,
      totalLessons:     4,
      isCurrent:        true,
      topics: [
        {
          key:              'topic-1',
          name:             'Introduction',
          completedLessons: 2,
          totalLessons:     4,
          isCurrent:        true,
          unresolved:       false,
          lessons:          [lesson1, lesson2, lesson3, lesson4],
        },
        {
          key:              'topic-unresolved',
          name:             'Future Topic',
          completedLessons: 0,
          totalLessons:     0,
          isCurrent:        false,
          unresolved:       true,
          lessons:          [],
        },
      ],
    },
    {
      key:              'intermediate',
      label:            'Intermediate',
      completedLessons: 0,
      totalLessons:     5,
      isCurrent:        false,
      topics: [
        {
          key:              'topic-2',
          name:             'Strategy',
          completedLessons: 0,
          totalLessons:     5,
          isCurrent:        false,
          unresolved:       false,
          lessons:          [lesson5],
        },
      ],
    },
  ],
};

const customContents: TrackContents = {
  kind: 'custom',
  id:   'plan-1',
  name: 'My Learning Path',
  enrolled: true,
  groups: [
    {
      key:              'group-1',
      label:            'Understanding market dynamics and how to position a product for long-term competitive advantage',
      completedLessons: 0,
      totalLessons:     3,
      isCurrent:        true,
      topics: [
        {
          key:              'topic-a',
          name:             'Market analysis',
          completedLessons: 0,
          totalLessons:     3,
          isCurrent:        true,
          unresolved:       false,
          lessons:          [lesson5],
        },
      ],
    },
  ],
};

describe('TrackContentsTree', () => {
  // ── Render basics ──────────────────────────────────────────────────────────

  it('renders all group labels', () => {
    render(<TrackContentsTree contents={mockContents} />);
    expect(screen.getByText('Beginner')).toBeTruthy();
    expect(screen.getByText('Intermediate')).toBeTruthy();
  });

  it('shows group lesson count', () => {
    render(<TrackContentsTree contents={mockContents} />);
    expect(screen.getByTestId('group-count-beginner')).toBeTruthy();
  });

  // ── Expansion — groups ─────────────────────────────────────────────────────

  it('groups are collapsed by default — topics are not visible', () => {
    render(<TrackContentsTree contents={mockContents} />);
    expect(screen.queryByText('Introduction')).toBeNull();
  });

  it('tapping a group expands it to show topics', () => {
    render(<TrackContentsTree contents={mockContents} />);
    fireEvent.press(screen.getByTestId('group-row-beginner'));
    expect(screen.getByText('Introduction')).toBeTruthy();
  });

  it('tapping an expanded group collapses it', () => {
    render(<TrackContentsTree contents={mockContents} />);
    fireEvent.press(screen.getByTestId('group-row-beginner'));
    fireEvent.press(screen.getByTestId('group-row-beginner'));
    expect(screen.queryByText('Introduction')).toBeNull();
  });

  // ── Expansion — topics ─────────────────────────────────────────────────────

  it('topics are collapsed by default — lessons are not visible', () => {
    render(<TrackContentsTree contents={mockContents} />);
    fireEvent.press(screen.getByTestId('group-row-beginner'));
    expect(screen.queryByText('What is PM?')).toBeNull();
  });

  it('tapping a topic expands it to show lessons', () => {
    render(<TrackContentsTree contents={mockContents} />);
    fireEvent.press(screen.getByTestId('group-row-beginner'));
    fireEvent.press(screen.getByTestId('topic-row-topic-1'));
    expect(screen.getByText('What is PM?')).toBeTruthy();
    expect(screen.getByText('Your role')).toBeTruthy();
  });

  it('tapping an expanded topic collapses it', () => {
    render(<TrackContentsTree contents={mockContents} />);
    fireEvent.press(screen.getByTestId('group-row-beginner'));
    fireEvent.press(screen.getByTestId('topic-row-topic-1'));
    fireEvent.press(screen.getByTestId('topic-row-topic-1'));
    expect(screen.queryByText('What is PM?')).toBeNull();
  });

  // ── Lesson status marks ────────────────────────────────────────────────────

  it('renders status marks for all statuses', () => {
    render(<TrackContentsTree contents={mockContents} />);
    fireEvent.press(screen.getByTestId('group-row-beginner'));
    fireEvent.press(screen.getByTestId('topic-row-topic-1'));

    expect(screen.getByTestId('lesson-status-l-1')).toBeTruthy(); // complete
    expect(screen.getByTestId('lesson-status-l-2')).toBeTruthy(); // in-progress
    expect(screen.getByTestId('lesson-status-l-3')).toBeTruthy(); // not-started + locked
    expect(screen.getByTestId('lesson-status-l-4')).toBeTruthy(); // skipped
  });

  // ── Locked lessons ─────────────────────────────────────────────────────────

  it('shows locked lesson title (legible — not hidden)', () => {
    render(<TrackContentsTree contents={mockContents} />);
    fireEvent.press(screen.getByTestId('group-row-beginner'));
    fireEvent.press(screen.getByTestId('topic-row-topic-1'));
    expect(screen.getByText('Premium lesson')).toBeTruthy();
  });

  it('shows lock indicator for locked lesson', () => {
    render(<TrackContentsTree contents={mockContents} />);
    fireEvent.press(screen.getByTestId('group-row-beginner'));
    fireEvent.press(screen.getByTestId('topic-row-topic-1'));
    expect(screen.getByTestId('lesson-locked-l-3')).toBeTruthy();
  });

  // ── Unresolved topics ──────────────────────────────────────────────────────

  it('renders unresolved topic with coming-soon marker', () => {
    render(<TrackContentsTree contents={mockContents} />);
    fireEvent.press(screen.getByTestId('group-row-beginner'));
    expect(screen.getByTestId('topic-unresolved-topic-unresolved')).toBeTruthy();
  });

  it('unresolved topic does not expand when pressed', () => {
    render(<TrackContentsTree contents={mockContents} />);
    fireEvent.press(screen.getByTestId('group-row-beginner'));
    fireEvent.press(screen.getByTestId('topic-unresolved-topic-unresolved'));
    // Lessons inside an unresolved topic never appear
    expect(screen.queryByTestId('topic-row-topic-unresolved')).toBeNull();
  });

  // ── Current markers ────────────────────────────────────────────────────────

  it('marks the current group', () => {
    render(<TrackContentsTree contents={mockContents} />);
    expect(screen.getByTestId('group-current-beginner')).toBeTruthy();
  });

  it('does not mark a non-current group', () => {
    render(<TrackContentsTree contents={mockContents} />);
    expect(screen.queryByTestId('group-current-intermediate')).toBeNull();
  });

  it('marks the current topic when group is expanded', () => {
    render(<TrackContentsTree contents={mockContents} />);
    fireEvent.press(screen.getByTestId('group-row-beginner'));
    expect(screen.getByTestId('topic-current-topic-1')).toBeTruthy();
  });

  // ── Topic progress ─────────────────────────────────────────────────────────

  it('shows progress indicator for a topic', () => {
    render(<TrackContentsTree contents={mockContents} />);
    fireEvent.press(screen.getByTestId('group-row-beginner'));
    expect(screen.getByTestId('topic-progress-topic-1')).toBeTruthy();
  });

  // ── initialExpanded ────────────────────────────────────────────────────────

  it('initialExpanded groupKey opens that group', () => {
    render(<TrackContentsTree contents={mockContents} initialExpanded={{ groupKey: 'beginner' }} />);
    expect(screen.getByText('Introduction')).toBeTruthy();
  });

  it('initialExpanded topicKey opens that topic', () => {
    render(
      <TrackContentsTree
        contents={mockContents}
        initialExpanded={{ groupKey: 'beginner', topicKey: 'topic-1' }}
      />,
    );
    expect(screen.getByText('What is PM?')).toBeTruthy();
  });

  // ── onLessonPress ──────────────────────────────────────────────────────────

  it('calls onLessonPress when tapping an unlocked lesson', () => {
    const onLessonPress = jest.fn();
    render(<TrackContentsTree contents={mockContents} onLessonPress={onLessonPress} />);
    fireEvent.press(screen.getByTestId('group-row-beginner'));
    fireEvent.press(screen.getByTestId('topic-row-topic-1'));
    fireEvent.press(screen.getByTestId('lesson-row-l-1'));
    expect(onLessonPress).toHaveBeenCalledWith(lesson1);
  });

  it('calls onLessonPress when tapping a locked lesson', () => {
    const onLessonPress = jest.fn();
    render(<TrackContentsTree contents={mockContents} onLessonPress={onLessonPress} />);
    fireEvent.press(screen.getByTestId('group-row-beginner'));
    fireEvent.press(screen.getByTestId('topic-row-topic-1'));
    fireEvent.press(screen.getByTestId('lesson-row-l-3'));
    expect(onLessonPress).toHaveBeenCalledWith(lesson3);
  });

  it('lesson rows are inert when onLessonPress is not provided', () => {
    render(<TrackContentsTree contents={mockContents} />);
    fireEvent.press(screen.getByTestId('group-row-beginner'));
    fireEvent.press(screen.getByTestId('topic-row-topic-1'));
    // Should not throw
    expect(() => fireEvent.press(screen.getByTestId('lesson-row-l-1'))).not.toThrow();
  });

  // ── Custom path — reason label wraps ──────────────────────────────────────

  it('renders the full reason sentence for a custom-path group without truncation', () => {
    render(<TrackContentsTree contents={customContents} />);
    const label = 'Understanding market dynamics and how to position a product for long-term competitive advantage';
    expect(screen.getByText(label)).toBeTruthy();
  });
});
