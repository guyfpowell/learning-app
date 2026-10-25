import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { revisitingLabel, type PathNextLesson } from '@learning/shared';
import { PathCard } from '../PathCard';
import { makeCustomPath } from '@/test-utils/paths';

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

  it('labels the revisit button "Revisit Lesson →"', () => {
    renderCard(makeCustomPath({
      id: 'plan-1',
      nextLesson: forward,
      revisit: { topicKey: 'disc', topicTitle: 'Discovery', nextLesson: revisitLesson, isRetake: true },
    }));
    expect(screen.getByText(/^Revisit Lesson →$/i)).toBeTruthy();
  });
});
