import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { revisitingLabel, type PathNextLesson, type TrackLevelProgress, type UserPath } from '@learning/shared';
import { HomePath } from '../HomePath';
import { makeCustomPath, makeTrackPath } from '@/test-utils/paths';
import { colors } from '@/theme';

const nextLesson: PathNextLesson = {
  id: 'lesson-1', skillPathId: 'sp-1', lessonNumber: 3, content: 'x', durationMinutes: 5, difficulty: 'beginner', isTeaser: false,
  createdAt: '', updatedAt: '', resumePhase: null,
  title: "The CPO's job — product as a lever of enterprise value",
  summary: 'What owning product contains — the four levers the CPO answers for.',
  topicName: 'CPO and VP Product — responsibilities compared',
  lessonIndex: 3, totalLessons: 8,
  skillPath: { level: 'beginner', levelLabel: null },
};

const levels: TrackLevelProgress[] = [
  { level: 'beginner', levelLabel: null, levelNum: 1, completedLessons: 4, totalLessons: 100, percentComplete: 4 },
  { level: 'intermediate', levelLabel: null, levelNum: 2, completedLessons: 0, totalLessons: 100, percentComplete: 0 },
];

const flat = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style);

function renderPath(path: UserPath = makeTrackPath({ id: 'skill-1', name: 'Product Strategy', nextLesson, levels, completedLessons: 4, totalLessons: 200, percentComplete: 4, canSkipLesson: true })) {
  const onStartLesson = jest.fn();
  const onSkip = jest.fn();
  const onOpen = jest.fn();
  render(<HomePath path={path} onStartLesson={onStartLesson} onSkip={onSkip} onOpen={onOpen} />);
  return { onStartLesson, onSkip, onOpen };
}

describe('HomePath', () => {
  it('names the path with its percentage, on the page', () => {
    renderPath();
    expect(screen.getByText('Product Strategy')).toBeTruthy();
    expect(screen.getByText('4% complete')).toBeTruthy();
  });

  it('shows each level as a segment, naming the one in progress', () => {
    renderPath();
    const bar = within(screen.getByTestId('level-bar'));
    expect(bar.getAllByTestId('track-map-level')).toHaveLength(2);
    expect(StyleSheet.flatten(bar.getByText('Beginner').props.style).fontFamily).not.toBe(StyleSheet.flatten(bar.getByText('Intermediate').props.style).fontFamily);
  });

  it('shows the topic, the level tag, one segment per lesson in it, and where the lesson is', () => {
    renderPath();
    const card = within(screen.getByTestId('next-lesson-card-skill-1'));
    expect(card.getByText('CPO and VP Product: responsibilities compared')).toBeTruthy();
    expect(card.getByText('BEGINNER')).toBeTruthy();
    expect(card.getByTestId('lesson-segments').children).toHaveLength(8);
    expect(card.getByText('Lesson 3 of 8')).toBeTruthy();
  });

  it('lights the segments: lessons done solid, the current part-lit, the rest faint', () => {
    renderPath();
    const segments = screen.getByTestId('lesson-segments').children;
    const colour = (i: number) => {
      const node = segments[i];
      return typeof node === 'string' ? undefined : StyleSheet.flatten(node.props.style).backgroundColor;
    };
    expect(colour(0)).toBe(colors.white);
    expect(colour(1)).toBe(colors.white);
    expect(colour(2)).not.toBe(colors.white);
    expect(colour(2)).not.toBe(colour(3));
  });

  it('shows the title and summary with the em dash replaced', () => {
    renderPath();
    expect(screen.getByText("The CPO's job: product as a lever of enterprise value")).toBeTruthy();
    expect(screen.getByText('What owning product contains: the four levers the CPO answers for.')).toBeTruthy();
    expect(screen.queryByText(/—/)).toBeNull();
  });

  it('starts the lesson with a white button on the cobalt card', () => {
    const { onStartLesson } = renderPath();
    expect(flat('next-lesson-btn-skill-1').backgroundColor).toBe(colors.white);
    expect(within(screen.getByTestId('next-lesson-card-skill-1')).getByText('Start lesson')).toBeTruthy();
    fireEvent.press(screen.getByTestId('next-lesson-btn-skill-1'));
    expect(onStartLesson).toHaveBeenCalledWith('lesson-1');
  });

  it('keeps the skip link off the cobalt card, and asks for a reason before skipping', () => {
    const { onSkip } = renderPath();
    expect(within(screen.getByTestId('next-lesson-card-skill-1')).queryByTestId('skip-lesson-btn-skill-1')).toBeNull();
    expect(screen.getByText('Skip lesson')).toBeTruthy();
    fireEvent.press(screen.getByTestId('skip-lesson-btn-skill-1'));
    expect(screen.getByTestId('skip-reason-picker')).toBeTruthy();
    expect(onSkip).not.toHaveBeenCalled();
  });

  it('opens the path when its name and progress are pressed', () => {
    const { onOpen } = renderPath();
    fireEvent.press(screen.getByLabelText('Open Product Strategy'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('shows a plain progress bar for a path with no levels', () => {
    renderPath(makeCustomPath({ id: 'plan-1', nextLesson, levels: [] }));
    expect(screen.queryByTestId('level-bar')).toBeNull();
  });

  it('while a revisit is set, continues to its lesson, labelled, with no skip', () => {
    const revisitLesson: PathNextLesson = { ...nextLesson, id: 'revisit-1', title: 'Revisited lesson' };
    const { onStartLesson } = renderPath(makeCustomPath({
      id: 'plan-1',
      nextLesson,
      canSkipLesson: true,
      revisit: { topicKey: 'disc', topicTitle: 'Discovery', nextLesson: revisitLesson, isRetake: false },
    }));
    expect(screen.getByText(revisitingLabel('Discovery'))).toBeTruthy();
    expect(screen.getByText('Revisit lesson')).toBeTruthy();
    fireEvent.press(screen.getByTestId('next-lesson-btn-plan-1'));
    expect(onStartLesson).toHaveBeenCalledWith('revisit-1');
    expect(screen.queryByTestId('skip-lesson-btn-plan-1')).toBeNull();
  });
});
