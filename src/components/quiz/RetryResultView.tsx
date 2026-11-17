import React from 'react';
import { StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Reveal, revealDelay } from '@/components/ui/Reveal';
import { QuizResultFrame, type ResultFrameControls } from '@/components/quiz/QuizResultFrame';
import { HintSection } from '@/components/quiz/ResultSections';
import { ResultButton } from '@/components/quiz/ResultButton';
import { ResultHeading, useResultHeadline } from '@/components/quiz/ResultHeading';
import { font, fontSize, results, spacing } from '@/theme';

/** A wrong first attempt: a nudge, the lesson's key takeaway, and "Try again". */
export function RetryResultView({ frame, keyTakeaway, onTryAgain }: {
  frame: ResultFrameControls;
  keyTakeaway: string | null | undefined;
  onTryAgain: () => void;
}) {
  const headline = useResultHeadline('retry');
  return (
    <QuizResultFrame
      {...frame}
      tone="retry"
      closable={false}
      action={<ResultButton testID="result-action-btn" tone="retry" label="Try again" icon="retake" onPress={onTryAgain} />}
    >
      <ResultHeading headline={headline}>
        <Text style={[styles.nudge, { color: results.retry.tint }]}>Have another go. Here's a nudge.</Text>
      </ResultHeading>
      {keyTakeaway && <Reveal delay={revealDelay(0)}><HintSection tone="retry" text={keyTakeaway} /></Reveal>}
    </QuizResultFrame>
  );
}

const styles = StyleSheet.create({
  nudge: { fontFamily: font.medium, fontSize: fontSize.md, marginTop: spacing.xs },
});
