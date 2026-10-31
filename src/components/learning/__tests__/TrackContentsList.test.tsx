import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { colors } from '@/theme';
import { resolveTrackView, type TrackView } from '@/lib/trackView';
import { TrackContentsList } from '../TrackContentsList';
import type { TrackContents, TrackContentsLesson } from '@learning/shared';

const done      = { id: 'l-1', title: 'What is PM?',   lessonNumber: 1, status: 'complete'    as const, locked: false };
const going     = { id: 'l-2', title: 'Your role',     lessonNumber: 2, status: 'in-progress' as const, locked: false };
const gated     = { id: 'l-3', title: 'Premium lesson', lessonNumber: 3, status: 'not-started' as const, locked: true };
const skipped   = { id: 'l-4', title: 'Skipped lesson', lessonNumber: 4, status: 'skipped'    as const, locked: false };
const doneGated = { id: 'l-5', title: 'Done but gated', lessonNumber: 5, status: 'complete'    as const, locked: true };

const contents: TrackContents = {
  kind: 'track',
  id: 'skill-1',
  name: 'Product Strategy',
  enrolled: true,
  groups: [
    {
      key: 'beginner', label: 'beginner', completedLessons: 2, totalLessons: 5, isCurrent: true,
      topics: [
        { key: 'topic-1', name: 'Introduction', completedLessons: 2, totalLessons: 5, isCurrent: true, unresolved: false,
          lessons: [done, going, gated, skipped, doneGated] },
        { key: 'topic-unresolved', name: 'Future Topic', completedLessons: 0, totalLessons: 0, isCurrent: false, unresolved: true, lessons: [] },
      ],
    },
    {
      key: 'intermediate', label: 'Intermediate', completedLessons: 0, totalLessons: 3, isCurrent: false,
      topics: [
        { key: 'topic-2', name: 'Strategy', completedLessons: 0, totalLessons: 3, isCurrent: false, unresolved: false, lessons: [] },
      ],
    },
  ],
};

function setup(view: TrackView = {}) {
  const onOpen = jest.fn();
  const onLessonPress = jest.fn();
  render(<TrackContentsList contents={contents} view={resolveTrackView(contents, view)} onOpen={onOpen} onLessonPress={onLessonPress} />);
  return { onOpen, onLessonPress };
}

const nameColor = (testID: string, text: string) => {
  const row = screen.getByTestId(testID);
  return StyleSheet.flatten(row.findByProps({ children: text }).props.style).color;
};

describe('TrackContentsList — the levels', () => {
  it('lists the levels with a capital letter and their counts, and nothing below them', () => {
    setup();
    expect(screen.getByText('Beginner')).toBeTruthy();
    expect(screen.getByText('Intermediate')).toBeTruthy();
    expect(screen.getByText('2 of 5 lessons')).toBeTruthy();
    expect(screen.queryByText('Introduction')).toBeNull();
    expect(screen.queryByText('What is PM?')).toBeNull();
  });

  it('opens a level when it is tapped', () => {
    const { onOpen } = setup();
    fireEvent.press(screen.getByTestId('group-row-intermediate'));
    expect(onOpen).toHaveBeenCalledWith({ group: 'intermediate' });
  });

  it('marks the current level once, in words and not with a bar', () => {
    setup();
    expect(screen.getAllByText('Current')).toHaveLength(1);
    expect(screen.queryByTestId('group-current-beginner')).toBeNull();
  });
});

describe('TrackContentsList — the topics of a level', () => {
  it('lists that level\'s topics and none of its lessons', () => {
    setup({ group: 'beginner' });
    expect(screen.getByText('Introduction')).toBeTruthy();
    expect(screen.getByText('2 of 5 lessons')).toBeTruthy();
    expect(screen.queryByText('Strategy')).toBeNull();
    expect(screen.queryByText('What is PM?')).toBeNull();
  });

  it('opens a topic when it is tapped', () => {
    const { onOpen } = setup({ group: 'beginner' });
    fireEvent.press(screen.getByTestId('topic-row-topic-1'));
    expect(onOpen).toHaveBeenCalledWith({ group: 'beginner', topic: 'topic-1' });
  });

  it('shows a topic with no lessons yet as coming soon, and does not open it', () => {
    const { onOpen } = setup({ group: 'beginner' });
    expect(screen.getByTestId('topic-unresolved-topic-unresolved')).toBeTruthy();
    fireEvent.press(screen.getByTestId('topic-unresolved-topic-unresolved'));
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('marks the current topic once', () => {
    setup({ group: 'beginner' });
    expect(screen.getAllByText('Current')).toHaveLength(1);
  });
});

describe('TrackContentsList — the lessons of a topic', () => {
  it('lists every lesson with its status and the lock on a locked one', () => {
    setup({ group: 'beginner', topic: 'topic-1' });
    [done, going, gated, skipped].forEach((l) => {
      expect(screen.getByText(l.title)).toBeTruthy();
      expect(screen.getByTestId(`lesson-status-${l.id}`)).toBeTruthy();
    });
    expect(screen.getByTestId('lesson-locked-l-3')).toBeTruthy();
  });

  it('opens a completed lesson when it is tapped', () => {
    const { onOpen, onLessonPress } = setup({ group: 'beginner', topic: 'topic-1' });
    fireEvent.press(screen.getByTestId('lesson-row-l-1'));
    expect(onLessonPress).toHaveBeenCalledWith(done as TrackContentsLesson);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('passes a completed but locked lesson on, so the caller can offer the upgrade', () => {
    const { onLessonPress } = setup({ group: 'beginner', topic: 'topic-1' });
    fireEvent.press(screen.getByTestId('lesson-row-l-5'));
    expect(onLessonPress).toHaveBeenCalledWith(doneGated as TrackContentsLesson);
  });

  it.each([['l-2', 'in progress'], ['l-3', 'not started'], ['l-4', 'skipped']])(
    'opens the summary, not the lesson, for %s (%s)',
    (id) => {
      const { onOpen, onLessonPress } = setup({ group: 'beginner', topic: 'topic-1' });
      fireEvent.press(screen.getByTestId(`lesson-row-${id}`));
      expect(onLessonPress).not.toHaveBeenCalled();
      expect(onOpen).toHaveBeenCalledWith({ group: 'beginner', topic: 'topic-1', lesson: id });
    },
  );
});

describe('TrackContentsList — look', () => {
  it('draws no progress bars: counts only', () => {
    setup({ group: 'beginner' });
    expect(screen.queryByTestId('topic-progress-topic-1')).toBeNull();
  });

  it('colours the current marker in the brand colour', () => {
    setup();
    expect(nameColor('group-row-beginner', 'Current')).toBe(colors.brand);
  });
});
