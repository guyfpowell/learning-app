import React from 'react';
import type { QuizFeedback } from '@learning/shared';
import { Reveal, revealDelay } from '@/components/ui/Reveal';
import { QuizFeedbackCard } from '@/components/quiz/QuizFeedbackCard';
import { QuizResultFrame, type ResultFrameControls } from '@/components/quiz/QuizResultFrame';
import { ResultButton } from '@/components/quiz/ResultButton';
import { ResultHeading, useResultHeadline } from '@/components/quiz/ResultHeading';
import { verdictTone } from '@/components/quiz/resultTone';

/** A resolved question with another still to answer: its feedback, then "Next question". */
export function FeedbackResultView({ frame, fb, onNext }: {
  frame: ResultFrameControls;
  fb: QuizFeedback | undefined;
  onNext: () => void;
}) {
  const tone = verdictTone(fb?.isCorrect === true);
  const headline = useResultHeadline(tone);
  return (
    <QuizResultFrame
      {...frame}
      tone={tone}
      action={<ResultButton testID="result-action-btn" tone={tone} label="Next question" icon="next" onPress={onNext} />}
    >
      <ResultHeading headline={headline} />
      {fb && <Reveal delay={revealDelay(0)}><QuizFeedbackCard fb={fb} tone={tone} /></Reveal>}
    </QuizResultFrame>
  );
}
