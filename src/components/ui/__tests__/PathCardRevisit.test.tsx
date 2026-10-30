import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { revisitingLabel, type PathNextLesson } from '@learning/shared';
import { PathCard } from '../PathCard';
import { makeCustomPath } from '@/test-utils/paths';
import { colors, spacing } from '@/theme';

function makeNextLesson(id: string, title: string, resumePhase: PathNextLesson['resumePhase'] = null): PathNextLesson {
  return {
    id,
    skillPathId: 'sp-1',
    lessonNumber: 1,
    title,
    content: '',
    durationMinutes: 3,
    difficulty: 'beginner',
    isTeaser: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    resumePhase,
  };
}

const forward = makeNextLesson('forward-1', 'Forward lesson');
const revisitLesson = makeNextLesson('revisit-1', 'Revisited lesson');

function renderCard(path = makeCustomPath({ id: 'plan-1', nextLesson: forward, canSkipLesson: true, canSkipTopic: true })) {
  const onStartLesson = jest.fn();
  render(<PathCard path={path} onStartLesson={onStartLesson} onSkip={jest.fn()} />);
  return { onStartLesson };
}

describe('PathCard revisit (079g7)', () => {
  it('continues to the forward lesson, with skips, when there is no revisit', () => {
    const { onStartLesson } = renderCard();
    fireEvent.press(screen.getByTestId('next-lesson-btn-plan-1'));
    expect(onStartLesson).toHaveBeenCalledWith('forward-1');
    expect(screen.getByTestId('skip-lesson-btn-plan-1')).toBeTruthy();
    expect(screen.queryByTestId('revisit-label-plan-1')).toBeNull();
  });

  it.each([true, false])('while a revisit is set (isRetake %s) continues to revisit.nextLesson, labelled, with no skips', (isRetake) => {
    const { onStartLesson } = renderCard(makeCustomPath({
      id: 'plan-1',
      nextLesson: forward,
      canSkipLesson: true,
      canSkipTopic: true,
      revisit: { topicKey: 'disc', topicTitle: 'Discovery', nextLesson: revisitLesson, isRetake },
    }));

    expect(screen.getByText(revisitingLabel('Discovery'))).toBeTruthy();
    expect(screen.getByText('Revisited lesson')).toBeTruthy();
    expect(screen.queryByText('Forward lesson')).toBeNull();
    fireEvent.press(screen.getByTestId('next-lesson-btn-plan-1'));
    expect(onStartLesson).toHaveBeenCalledWith('revisit-1');
    expect(screen.queryByTestId('skip-lesson-btn-plan-1')).toBeNull();
    expect(screen.queryByTestId('skip-topic-btn-plan-1')).toBeNull();
  });

  it('closes an open skip picker when a revisit arrives, so nothing skips the forward position', () => {
    const forwardPath = makeCustomPath({ id: 'plan-1', nextLesson: forward, canSkipLesson: true });
    const onSkip = jest.fn();
    const { rerender } = render(<PathCard path={forwardPath} onStartLesson={jest.fn()} onSkip={onSkip} />);
    fireEvent.press(screen.getByTestId('skip-lesson-btn-plan-1'));
    expect(screen.getByTestId('skip-reason-picker')).toBeTruthy();

    const revisitPath = makeCustomPath({
      ...forwardPath,
      revisit: { topicKey: 'disc', topicTitle: 'Discovery', nextLesson: revisitLesson, isRetake: false },
    });
    rerender(<PathCard path={revisitPath} onStartLesson={jest.fn()} onSkip={onSkip} />);

    expect(screen.queryByTestId('skip-reason-picker')).toBeNull();
  });

  it('labels the revisit button "Revisit Lesson"', () => {
    renderCard(makeCustomPath({
      id: 'plan-1',
      nextLesson: forward,
      revisit: { topicKey: 'disc', topicTitle: 'Discovery', nextLesson: revisitLesson, isRetake: true },
    }));
    expect(screen.getByText(/^Revisit Lesson$/i)).toBeTruthy();
  });
});

describe('PathCard hero variant (090)', () => {
  const path = makeCustomPath({ id: 'plan-1', nextLesson: forward, canSkipLesson: true });
  const flat = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style);

  it('draws the next-lesson card in cobalt with a coral button', () => {
    render(<PathCard variant="hero" path={path} onStartLesson={jest.fn()} onSkip={jest.fn()} />);
    expect(flat('next-lesson-card-plan-1').backgroundColor).toBe(colors.brand);
    expect(flat('next-lesson-btn-plan-1').backgroundColor).toBe(colors.coral);
  });

  it('keeps the skip button off the cobalt card', () => {
    render(<PathCard variant="hero" path={path} onStartLesson={jest.fn()} onSkip={jest.fn()} />);
    expect(screen.getByTestId('skip-lesson-btn-plan-1')).toBeTruthy();
    expect(within(screen.getByTestId('next-lesson-card-plan-1')).queryByTestId('skip-lesson-btn-plan-1')).toBeNull();
  });

  it('gives the progress card a hairline border, the hero a gap above it, and Skip the ghost look', () => {
    render(<PathCard variant="hero" path={path} onStartLesson={jest.fn()} onSkip={jest.fn()} />);
    expect(flat('enrollment-card-plan-1')).toEqual(expect.objectContaining({ borderWidth: 1, borderColor: colors.borderSubtle }));
    expect(flat('next-lesson-card-plan-1').marginTop).toBe(spacing.md);
    expect(flat('skip-lesson-btn-plan-1').backgroundColor).toBe('transparent');
    expect(flat('skip-lesson-btn-plan-1').borderWidth).toBeUndefined();
  });

  it('leaves the default variant on the paper card with the primary button', () => {
    render(<PathCard path={path} onStartLesson={jest.fn()} onSkip={jest.fn()} />);
    expect(flat('next-lesson-card-plan-1').backgroundColor).toBe(colors.surface);
    expect(flat('next-lesson-btn-plan-1').backgroundColor).toBe(colors.brand);
    expect(flat('enrollment-card-plan-1').borderWidth).toBeUndefined();
    expect(flat('skip-lesson-btn-plan-1').borderColor).toBe(colors.brand);
  });
});
