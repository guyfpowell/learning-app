import React from 'react';
import { EdgeButton } from '@/components/ui/EdgeButton';
import type { IconName } from '@/components/ui/Icon';
import { colors, results } from '@/theme';
import type { ResultTone } from '@/components/quiz/resultTone';

/** The face, label and edge of the one button on a verdict screen: white on the colours, ink on sand. */
export function resultButtonLook(tone: ResultTone) {
  return tone === 'retry'
    ? { face: colors.surfaceInverse, label: colors.white, edge: results.incorrect.edge }
    : { face: colors.white, label: colors.textStrong, edge: results[tone].edge };
}

/** The verdict screen's one pinned button. */
export function ResultButton({ tone, label, icon, onPress, testID, accessibilityLabel }: {
  tone: ResultTone;
  label: string;
  icon: IconName;
  onPress: () => void;
  testID?: string;
  accessibilityLabel?: string;
}) {
  return <EdgeButton look={resultButtonLook(tone)} label={label} icon={icon} onPress={onPress} testID={testID} accessibilityLabel={accessibilityLabel} />;
}
