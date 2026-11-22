import { useEffect, useRef, useState } from 'react';
import { lessonOpeningPhase, type ForegroundClock, type Lesson, type LessonPhase, type UserPath } from '@learning/shared';
import { useSavePosition } from '@/hooks/useLesson';
import { BREADCRUMB_CATEGORY, warnBreadcrumb } from '@/lib/breadcrumbs';

/**
 * The lesson opens on the full text, never the summary-only step (096): the Home hero already shows the
 * summary. A saved 'collapsed' position (shared rule, still used by web) reads as 'expanded' here.
 */
function readingPhase(phase: LessonPhase): LessonPhase {
  return phase === 'collapsed' ? 'expanded' : phase;
}

export interface LessonPhaseState {
  /** A completed lesson, not mid-retake: looked back over (summary, lesson and quiz), not read through. */
  viewing: boolean;
  phase: LessonPhase;
  /** Moves the reader on and saves the position. */
  changePhase: (next: LessonPhase) => void;
}

/**
 * Where the reader is in a lesson. It opens by the shared rule, the same as web, once paths load
 * (they carry the saved position). A retake started from the completed view is a new pass: its
 * clock restarts and it begins at the lesson, not the takeaway the opening rule gives a completed
 * lesson. Every move is saved, fire-and-forget.
 */
export function useLessonPhase({ lessonId, lesson, paths, clock }: {
  lessonId: string;
  lesson: Lesson | undefined;
  paths: UserPath[] | undefined;
  clock: Pick<ForegroundClock, 'reset'>;
}): LessonPhaseState {
  const [phase, setPhase] = useState<LessonPhase>('expanded');
  const viewing = !!lesson?.quizCompleted && !lesson.lessonRetakeInProgress;

  // A failure is silent to the user (spec constraint 6), never to us. Safe to send again (ADR-021):
  // it waits through a drop and keeps its order behind the lesson's other writes.
  const savePosition = useSavePosition(lessonId);
  function changePhase(next: LessonPhase) {
    setPhase(next);
    savePosition.mutate({ lessonId, phase: next }, {
      onError: (err) => warnBreadcrumb(BREADCRUMB_CATEGORY.lesson, 'Position save failed', err, { lessonId, phase: next }),
    });
  }

  // Opens once per lesson, so a move the reader makes is never undone by a refetch.
  const openedLessonId = useRef<string | null>(null);
  useEffect(() => {
    if (!lesson || !paths || openedLessonId.current === lesson.id) return;
    openedLessonId.current = lesson.id;
    changePhase(readingPhase(lessonOpeningPhase(lesson, paths)));
  }, [lesson?.id, lesson?.quizCompleted, paths]);

  const wasViewing = useRef(false);
  useEffect(() => {
    if (wasViewing.current && lesson && !viewing) {
      clock.reset();
      changePhase('expanded');
    }
    wasViewing.current = viewing;
  }, [viewing]);

  return { viewing, phase, changePhase };
}
